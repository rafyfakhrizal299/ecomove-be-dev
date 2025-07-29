export default function adminOnly(req, res, next) {
  const user = req.user;

  if (!user || user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Forbidden: Admins only' });
  }

  next();
}