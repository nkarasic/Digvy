import { Router } from 'express';
import * as itemService from '../services/itemService.js';
import { validate } from '../middleware/validate.js';
import { itemCreateSchema, itemUpdateSchema } from '../schemas.js';

const router = Router();

// GET /api/items — list with optional filters
router.get('/', async (req, res) => {
  try {
    const { dashboard, status } = req.query;
    const filters = {};
    if (dashboard === 'true') filters.dashboard = true;
    if (status) filters.status = status;
    const result = await itemService.getAll(req.userId, filters);
    res.json(result);
  } catch (err) {
    console.error('GET /api/items error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/items/:id
router.get('/:id', async (req, res) => {
  try {
    const item = await itemService.getById(req.userId, req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/items
router.post('/', validate(itemCreateSchema), async (req, res) => {
  try {
    const item = await itemService.create(req.userId, req.body);
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/items/:id
router.put('/:id', validate(itemUpdateSchema), async (req, res) => {
  try {
    const item = await itemService.update(req.userId, req.params.id, req.body);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/items/:id
router.delete('/:id', async (req, res) => {
  try {
    const removed = await itemService.remove(req.userId, req.params.id);
    if (!removed) return res.status(404).json({ error: 'Item not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
