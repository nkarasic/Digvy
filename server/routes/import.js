import { Router } from 'express';
import multer from 'multer';
import { parseCSV } from '../services/csvParser.js';
import { bulkCreate } from '../services/itemService.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/import/preview — parse CSV, return candidates
router.post('/preview', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const content = req.file.buffer.toString('utf-8');
    const items = parseCSV(content);
    res.json({ items, count: items.length });
  } catch (err) {
    console.error('Import preview error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/import/confirm — write items to DB
router.post('/confirm', async (req, res) => {
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Items array required' });
    }

    // Strip internal fields before saving
    const cleaned = items.map(({ _warnings, _score, ...item }) => item);
    const created = await bulkCreate(cleaned);
    res.status(201).json({ imported: created.length, items: created });
  } catch (err) {
    console.error('Import confirm error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
