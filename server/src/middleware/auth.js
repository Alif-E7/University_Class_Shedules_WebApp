import jwt from 'jsonwebtoken';

const SECRET = () => process.env.JWT_SECRET || 'dev-secret';

/**
 * Verify JWT and attach req.user with { user_id, role, department_id, email }.
 */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const token = header.slice(7);
    req.user = jwt.verify(token, SECRET());
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Only central_admin role.
 */
export function requireCentralAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'central_admin') {
      return res.status(403).json({ error: 'Central admin access required' });
    }
    next();
  });
}

/**
 * dept_admin or central_admin.
 * For dept_admin, req.user.department_id is guaranteed to exist.
 */
export function requireDeptAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'central_admin' && req.user.role !== 'dept_admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
}

/**
 * Helper: get the department_id scope for the current user.
 * Central admin can optionally pass ?department_id= to scope.
 * Dept admin is always scoped to their own department.
 */
export function getScopedDepartmentId(req) {
  if (req.user.role === 'dept_admin') {
    return req.user.department_id;
  }
  // central_admin: use query/body param if provided, else null (all departments)
  return req.query.department_id || req.body?.department_id || null;
}
