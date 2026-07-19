import { Router } from 'express';
import Fuse from 'fuse.js';
import supabase from '../db.js';
import { computeUrgency } from '../services/urgencyService.js';
import { daysSince } from '../utils/dateHelpers.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) return res.json([]);

    const userId = req.userId;

    const { data: items, error } = await supabase
      .from('items')
      .select('*, logs(*)')
      .eq('user_id', userId);

    if (error) throw new Error(error.message);

    // Sort logs within each item
    for (const item of items) {
      if (item.logs) {
        item.logs.sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.created_at || '').localeCompare(b.created_at || ''));
      }
    }

    // Build searchable docs with flattened log notes
    const docs = items.map(item => ({
      ...item,
      _logNotes: (item.logs || []).map(l => l.note).join(' '),
    }));

    const fuse = new Fuse(docs, {
      keys: [
        { name: 'name', weight: 3 },
        { name: 'category', weight: 2 },
        { name: 'details', weight: 2 },
        { name: '_logNotes', weight: 1 },
      ],
      threshold: 0.4,
      includeScore: true,
    });

    const results = fuse.search(q.trim(), { limit: 30 });

    const enriched = results.map(r => {
      const item = { ...r.item };
      delete item._logNotes;
      const urgency = computeUrgency(item);
      const lastLog = item.logs?.length > 0 ? item.logs[item.logs.length - 1] : null;
      return {
        ...item,
        urgency,
        days_since_last: lastLog ? daysSince(lastLog.date) : null,
        _score: r.score,
      };
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
