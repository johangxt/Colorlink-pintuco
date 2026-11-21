const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const { httpError, texto, EMAIL_RE } = require('../services/util');

const CODIGO_VIDA_MS = 10 * 60 * 1000; // el código vence a los 10 minutos
const MAX_INTENTOS = 5;                // intentos fallidos por código
const REENVIO_MS = 60 * 1000;          // espera mínima entre envíos

module.exports = function authRoutes({ repo, auth, config, mailer }) {
  const r = express.Router();

  const hashCodigo = (id, codigo) => crypto.createHmac('sha256', config.jwtSecret).update(`${id}:${codigo}`).digest('hex');

  // Genera un código de 6 dígitos, guarda solo su hash y lo envía al correo del usuario
  async function emitirCodigo(usuario) {
    const codigo = String(crypto.randomInt(100000, 1000000));
    await repo.update('usuarios', usuario.id, {
      codigo_verificacion: hashCodigo(usuario.id, codigo),
      codigo_expira: new Date(Date.now() + CODIGO_VIDA_MS).toISOString(),
      codigo_intentos: 0,
      codigo_enviado: new Date().toISOString(),
    });
    await mailer.enviarCodigo(usuario.email, usuario.nombre, codigo);
  }

  function validarEspera(usuario) {
    const falta = usuario.codigo_enviado ? REENVIO_MS - (Date.now() - Date.parse(usuario.codigo_enviado)) : 0;
    if (falta > 0) throw httpError(429, `Espera ${Math.ceil(falta / 1000)} segundos para pedir otro código`);
  }

  // Registro público: solo clientes y pintores (el admin se crea en la base de datos).
  // La cuenta queda sin verificar hasta que se confirme el código enviado al correo.
  r.post('/registro', async (req, res) => {
    const nombre = texto(req.body.nombre, 'nombre', { min: 3, max: 120 });
    const email = texto(req.body.email, 'email', { max: 160 }).toLowerCase();
    const password = texto(req.body.password, 'password', { min: 8, max: 72 });
    const telefono = texto(req.body.telefono, 'telefono', { max: 30, opcional: true });
    const rol = req.body.rol || 'cliente';
    if (!EMAIL_RE.test(email)) throw httpError(400, 'El correo electrónico no es válido');
    if (!['cliente', 'pintor'].includes(rol)) throw httpError(400, 'Rol no permitido');

    const existente = await repo.findOne('usuarios', { email });
    // Un correo ya verificado no se puede volver a registrar; uno sin verificar sí (evita bloquear el correo de otra persona)
    if (existente && existente.email_verificado !== false) throw httpError(409, 'Ya existe una cuenta con ese correo');
    if (existente) validarEspera(existente);

    const datos = {
      nombre, email, telefono, rol, activo: true, email_verificado: false,
      password_hash: await bcrypt.hash(password, 10),
    };
    const usuario = existente
      ? await repo.update('usuarios', existente.id, datos)
      : await repo.insert('usuarios', datos);

    try {
      await emitirCodigo(usuario);
    } catch (err) {
      if (!existente) await repo.remove('usuarios', usuario.id);
      throw err;
    }
    res.status(201).json({ verificacion: true, email });
  });

  r.post('/verificar', async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const codigo = String(req.body.codigo || '').trim();
    const usuario = email ? await repo.findOne('usuarios', { email }) : null;
    const invalido = httpError(400, 'Código incorrecto');
    if (!usuario || usuario.email_verificado !== false || !usuario.codigo_verificacion) throw invalido;
    if ((usuario.codigo_intentos || 0) >= MAX_INTENTOS) throw httpError(429, 'Demasiados intentos. Solicita un código nuevo.');
    if (!usuario.codigo_expira || Date.parse(usuario.codigo_expira) < Date.now()) throw httpError(400, 'El código venció. Solicita uno nuevo.');

    const esperado = Buffer.from(usuario.codigo_verificacion);
    const recibido = Buffer.from(hashCodigo(usuario.id, codigo));
    const coincide = /^\d{6}$/.test(codigo) && esperado.length === recibido.length && crypto.timingSafeEqual(esperado, recibido);
    if (!coincide) {
      await repo.update('usuarios', usuario.id, { codigo_intentos: (usuario.codigo_intentos || 0) + 1 });
      throw invalido;
    }

    const verificado = await repo.update('usuarios', usuario.id, {
      email_verificado: true, codigo_verificacion: null, codigo_expira: null, codigo_intentos: 0, codigo_enviado: null,
    });
    res.json({ token: auth.firmarToken(verificado), usuario: publico(verificado) });
  });

  r.post('/reenviar', async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const usuario = email ? await repo.findOne('usuarios', { email }) : null;
    if (usuario && usuario.email_verificado === false) {
      validarEspera(usuario);
      await emitirCodigo(usuario);
    }
    res.json({ ok: true }); // misma respuesta exista o no el correo
  });

  r.post('/login', async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const usuario = email ? await repo.findOne('usuarios', { email }) : null;
    if (!usuario || usuario.activo === false || !(await bcrypt.compare(password, usuario.password_hash))) {
      throw httpError(401, 'Correo o contraseña incorrectos');
    }
    if (usuario.email_verificado === false) {
      return res.status(403).json({ error: 'Debes verificar tu correo antes de ingresar', requiereVerificacion: true, email });
    }
    res.json({ token: auth.firmarToken(usuario), usuario: publico(usuario) });
  });

  r.get('/me', auth.requerirSesion, (req, res) => res.json({ usuario: req.usuario }));

  return r;
};

const publico = (u) => ({ id: u.id, nombre: u.nombre, email: u.email, rol: u.rol, telefono: u.telefono });
