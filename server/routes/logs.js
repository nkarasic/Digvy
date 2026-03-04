import { Router } from 'express';
import * as logService from '../services/logService.js';

const router = Router();

// POST /api/items/:id/logs
router.post('/:id/logs', async (req, res) => {
  try {
    const result = await logService.addLog(req.params.id, req.body);
    if (!result) return res.status(404).json({ error: 'Item not found' });
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/items/:id/snooze
router.post('/:id/snooze', async (req, res) => {
  try {
    const { snoozed_until } = req.body;
    const item = await logService.snooze(req.params.id, snoozed_until);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
