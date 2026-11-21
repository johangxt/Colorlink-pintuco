const jwt = require('jsonwebtoken');

function crearAuth({ config, repo }) {
  const firmarToken = (u) => jwt.sign({ id: u.id, rol: u.rol, nombre: u.nombre }, config.jwtSecret, { expiresIn: config.jwtExpires });

  async function requerirSesion(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Debe iniciar sesión' });
    try {
      const payload = jwt.verify(token, config.jwtSecret);
      const usuario = await repo.getById('usuarios', payload.id);
      if (!usuario || usuario.activo === false) return res.status(401).json({ error: 'Usuario no válido' });
      req.usuario = { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol };
      next();
    } catch {
      return res.status(401).json({ error: 'Sesión expirada o inválida' });
    }
  }

  const requerirRol = (...roles) => (req, res, next) => {
    if (!req.usuario || !roles.includes(req.usuario.rol)) {
      return res.status(403).json({ error: 'No tiene permisos para esta acción' });
    }
    next();
  };

  return { firmarToken, requerirSesion, requerirRol };
}

module.exports = { crearAuth };
