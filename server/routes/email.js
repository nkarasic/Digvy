import { Router } from 'express';
import supabase from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { emailPreferencesSchema } from '../schemas.js';

const router = Router();

const page = (title, body) => `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:80px auto;padding:0 16px;color:#111827;">
  <h2>${title}</h2>
  <p style="color:#6b7280;">${body}</p>
  <p><a href="${process.env.APP_URL || 'https://digvy.vercel.app'}" style="color:#2563eb;">Back to Digvy</a></p>
</body></html>`;

// Public one-click unsubscribe, authorized by the per-user token embedded
// in the digest email. Idempotent; a stale token just shows "link expired".
router.get('/unsubscribe', async (req, res) => {
  const token = req.query.token;
  if (typeof token !== 'string' || token.length < 8 || token.length > 128) {
    return res.status(400).send(page('Invalid link', 'This unsubscribe link is malformed.'));
  }

  try {
    const { data, error } = await supabase
      .from('email_preferences')
      .update({ digest_enabled: false, updated_at: new Date().toISOString() })
      .eq('unsubscribe_token', token)
      .select('user_id');

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) {
      return res.status(404).send(page('Link expired', 'This unsubscribe link is no longer valid.'));
    }

    res.send(page('Unsubscribed', 'You will no longer receive Digvy digest emails. You can re-enable them any time from the app.'));
  } catch (err) {
    res.status(500).send(page('Something went wrong', 'Please try again later.'));
  }
});

// Authed preference endpoints for the app UI. No row means subscribed
// (the digest job creates the row on first send).
router.get('/preferences', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('email_preferences')
      .select('digest_enabled')
      .eq('user_id', req.userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    res.json({ digest_enabled: data ? data.digest_enabled : true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/preferences', requireAuth, validate(emailPreferencesSchema), async (req, res) => {
  try {
    const { error } = await supabase
      .from('email_preferences')
      .upsert(
        {
          user_id: req.userId,
          digest_enabled: req.body.digest_enabled,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (error) throw new Error(error.message);
    res.json({ digest_enabled: req.body.digest_enabled });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
