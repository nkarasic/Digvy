import { Router } from 'express';
import * as itemService from '../services/itemService.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const categories = await itemService.getCategories();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
