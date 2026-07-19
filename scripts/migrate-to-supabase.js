/**
 * Migrate db.json data to Supabase
 *
 * Usage:
 *   node scripts/migrate-to-supabase.js <user-email>
 *
 * This assigns all existing items to the specified user account.
 * The user must already exist in Supabase Auth.
 */

import 'dotenv/config';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';

const __dirname = dirname(fileURLToPath(import.meta.url));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: node scripts/migrate-to-supabase.js <user-email>');
    process.exit(1);
  }

  // Find user by email
  const { data: { users }, error: userErr } = await supabase.auth.admin.listUsers();
  if (userErr) throw userErr;

  const user = users.find(u => u.email === email);
  if (!user) {
    console.error(`User with email "${email}" not found. Sign up first, then run this script.`);
    process.exit(1);
  }

  const userId = user.id;
  console.log(`Migrating data for user: ${email} (${userId})`);

  // Read db.json
  const dbPath = join(__dirname, '..', 'db.json');
  const raw = await readFile(dbPath, 'utf-8');
  const data = JSON.parse(raw);

  if (!data.items || data.items.length === 0) {
    console.log('No items to migrate.');
    return;
  }

  console.log(`Found ${data.items.length} items to migrate.`);

  let itemCount = 0;
  let logCount = 0;

  for (const item of data.items) {
    const { logs, ...itemData } = item;

    // Insert item
    const itemRow = {
      id: itemData.id || nanoid(),
      user_id: userId,
      name: itemData.name || '',
      category: itemData.category || '',
      status: itemData.status || 'Active',
      logic_type: itemData.logic_type || 'Fixed',
      interval_months: itemData.interval_months || null,
      is_evergreen: itemData.next_date === 'never',
      next_date: itemData.next_date === 'never' ? null : (itemData.next_date || null),
      cancel_by_date: itemData.cancel_by_date || null,
      details: itemData.details || '',
      link_url: itemData.link_url || null,
      date_type: itemData.date_type || 'firm',
      booking_lead_days: itemData.booking_lead_days != null ? Number(itemData.booking_lead_days) : 21,
      snoozed_until: itemData.snoozed_until || null,
    };

    const { error: itemErr } = await supabase.from('items').insert(itemRow);
    if (itemErr) {
      console.error(`Failed to insert item "${item.name}":`, itemErr.message);
      continue;
    }
    itemCount++;

    // Insert logs
    if (logs && logs.length > 0) {
      const logRows = logs.map(l => ({
        id: l.id || nanoid(),
        item_id: itemRow.id,
        user_id: userId,
        date: l.date || '',
        time: l.time || null,
        price_paid: l.price_paid != null ? Number(l.price_paid) : null,
        note: l.note || '',
      }));

      const { error: logErr } = await supabase.from('logs').insert(logRows);
      if (logErr) {
        console.error(`Failed to insert logs for "${item.name}":`, logErr.message);
      } else {
        logCount += logRows.length;
      }
    }
  }

  console.log(`Migration complete: ${itemCount} items, ${logCount} logs.`);
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
