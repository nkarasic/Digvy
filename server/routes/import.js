import { Router } from 'express';
import multer from 'multer';
import { parseCSV } from '../services/csvParser.js';
import { bulkCreate } from '../services/itemService.js';
import { validate } from '../middleware/validate.js';
import { importConfirmSchema } from '../schemas.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
});

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
router.post('/confirm', validate(importConfirmSchema), async (req, res) => {
  try {
    // Schema validation strips internal fields (_warnings, _score)
    const created = await bulkCreate(req.userId, req.body.items);
    res.status(201).json({ imported: created.length, items: created });
  } catch (err) {
    console.error('Import confirm error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
