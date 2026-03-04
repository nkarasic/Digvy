import { Router } from 'express';
import * as statsService from '../services/statsService.js';

const router = Router();

router.get('/spend-by-category', async (req, res) => {
  try {
    const data = await statsService.getSpendByCategory();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/upcoming-costs', async (req, res) => {
  try {
    const days = req.query.days ? parseInt(req.query.days) : 90;
    const data = await statsService.getUpcomingCosts(days);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/subscriptions', async (req, res) => {
  try {
    const data = await statsService.getSubscriptionSummary();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/intervals', async (req, res) => {
  try {
    const data = await statsService.getIntervalStats();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
