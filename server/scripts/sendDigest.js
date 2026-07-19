// Manual digest trigger for local development.
//   npm run digest -- --dry-run   render digests to stdout, send nothing
//   npm run digest                send for real (needs RESEND_API_KEY)
import 'dotenv/config';
import { runDigest } from '../services/digestService.js';

const dryRun = process.argv.includes('--dry-run');

const result = await runDigest({ dryRun });

for (const s of result.sent) {
  console.log(`${dryRun ? '[dry-run] would send' : 'sent'} to ${s.email} — "${s.subject}"`);
  if (dryRun) console.log(`\n${s.text}`);
}
for (const s of result.skipped) {
  console.log(`skipped ${s.userId}: ${s.reason}`);
}
for (const e of result.errors) {
  console.error(`error for ${e.userId}: ${e.error}`);
}

console.log(`\n${result.sent.length} sent, ${result.skipped.length} skipped, ${result.errors.length} errors`);
process.exit(result.errors.length > 0 ? 1 : 0);
