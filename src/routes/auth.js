const express = require('express');
const bcrypt = require('bcryptjs');
const { httpError, texto, EMAIL_RE } = require('../services/util');

module.exports = function authRoutes({ repo, auth }) {
  const r = express.Router();

  // Registro público: solo clientes y pintores (el admin se crea en la base de datos)
  r.post('/registro', async (req, res) => {
    const nombre = texto(req.body.nombre, 'nombre', { min: 3, max: 120 });
    const email = texto(req.body.email, 'email', { max: 160 }).toLowerCase();
    const password = texto(req.body.password, 'password', { min: 8, max: 72 });
    const telefono = texto(req.body.telefono, 'telefono', { max: 30, opcional: true });
    const rol = req.body.rol || 'cliente';
    if (!EMAIL_RE.test(email)) throw httpError(400, 'El correo electrónico no es válido');
    if (!['cliente', 'pintor'].includes(rol)) throw httpError(400, 'Rol no permitido');
    if (await repo.findOne('usuarios', { email })) throw httpError(409, 'Ya existe una cuenta con ese correo');

    const usuario = await repo.insert('usuarios', {
      nombre, email, telefono, rol, activo: true,
      password_hash: await bcrypt.hash(password, 10),
    });
    res.status(201).json({ token: auth.firmarToken(usuario), usuario: publico(usuario) });
  });

  r.post('/login', async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const usuario = email ? await repo.findOne('usuarios', { email }) : null;
    if (!usuario || usuario.activo === false || !(await bcrypt.compare(password, usuario.password_hash))) {
      throw httpError(401, 'Correo o contraseña incorrectos');
    }
    res.json({ token: auth.firmarToken(usuario), usuario: publico(usuario) });
  });

  r.get('/me', auth.requerirSesion, (req, res) => res.json({ usuario: req.usuario }));

  return r;
};

const publico = (u) => ({ id: u.id, nombre: u.nombre, email: u.email, rol: u.rol, telefono: u.telefono });
