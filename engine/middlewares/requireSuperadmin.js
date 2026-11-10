// engine/middlewares/requireSuperadmin.js
// Bloqueia acesso a rotas administrativas.
// Usa req.user.is_superadmin populado pelo authMiddleware.

module.exports = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Nao autenticado' });
  }
  if (!req.user.is_superadmin) {
    return res.status(403).json({ error: 'Acesso restrito a administradores' });
  }
  next();
};