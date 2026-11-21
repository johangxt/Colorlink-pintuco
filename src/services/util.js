function httpError(status, mensaje) {
  const e = new Error(mensaje);
  e.status = status;
  return e;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function texto(valor, campo, { min = 1, max = 500, opcional = false } = {}) {
  if (valor === undefined || valor === null || String(valor).trim() === '') {
    if (opcional) return null;
    throw httpError(400, `El campo "${campo}" es obligatorio`);
  }
  const s = String(valor).trim();
  if (s.length < min || s.length > max) throw httpError(400, `El campo "${campo}" debe tener entre ${min} y ${max} caracteres`);
  return s;
}

function numero(valor, campo, { min = -Infinity, max = Infinity, entero = false } = {}) {
  const n = Number(valor);
  if (valor === '' || valor === null || valor === undefined || !Number.isFinite(n)) throw httpError(400, `El campo "${campo}" debe ser numérico`);
  if (entero && !Number.isInteger(n)) throw httpError(400, `El campo "${campo}" debe ser un número entero`);
  if (n < min || n > max) throw httpError(400, `El campo "${campo}" debe estar entre ${min} y ${max}`);
  return n;
}

module.exports = { httpError, texto, numero, EMAIL_RE };
