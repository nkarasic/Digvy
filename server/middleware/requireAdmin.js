import { getRole } from '../services/adminService.js';

// Tier ranking: a higher number satisfies any lower minimum.
const RANK = { support: 1, admin: 2 };

// Gate for operator-only routes. Runs AFTER requireAuth (which sets
// req.userId). Rejects anyone whose role is below minRole. Sets req.adminRole
// so handlers can log the actor and branch on tier.
export function requireAdmin(minRole = 'support') {
  return async (req, res, next) => {
    try {
      const role = await getRole(req.userId);
      if (!role || RANK[role] < RANK[minRole]) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      req.adminRole = role;
      next();
    } catch (err) {
      return res.status(500).json({ error: 'Authorization check failed' });
    }
  };
}
