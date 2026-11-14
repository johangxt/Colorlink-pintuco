// Implementación en memoria del repositorio (misma interfaz que supabase.js).
// Se usa para pruebas automatizadas y para demostrar la app sin conexión a Supabase.
const bcrypt = require('bcryptjs');
const seed = require('./seedData');

const TABLAS = ['usuarios', 'pinturas', 'pedidos', 'pedido_items', 'solicitudes', 'calificaciones', 'mensajes_chat'];

function createMemoryRepo({ conDatos = true } = {}) {
  const data = {};
  const seq = {};
  TABLAS.forEach((t) => { data[t] = []; seq[t] = 0; });

  const clone = (o) => (o ? JSON.parse(JSON.stringify(o)) : o);
  const coincide = (row, where) => Object.entries(where).every(([k, v]) => {
    if (Array.isArray(v)) return v.includes(row[k]);
    return row[k] === v;
  });

  const repo = {
    async insert(tabla, row) {
      const nuevo = { id: ++seq[tabla], created_at: new Date().toISOString(), ...row };
      data[tabla].push(nuevo);
      return clone(nuevo);
    },
    async select(tabla, where = {}, opts = {}) {
      let rows = data[tabla].filter((r) => coincide(r, where));
      if (opts.orderBy) {
        const dir = opts.ascending === false ? -1 : 1;
        rows = [...rows].sort((a, b) => (a[opts.orderBy] > b[opts.orderBy] ? dir : a[opts.orderBy] < b[opts.orderBy] ? -dir : 0));
      }
      if (opts.limit) rows = rows.slice(0, opts.limit);
      return clone(rows);
    },
    async getById(tabla, id) {
      return clone(data[tabla].find((r) => r.id === Number(id)) || null);
    },
    async findOne(tabla, where) {
      return clone(data[tabla].find((r) => coincide(r, where)) || null);
    },
    async update(tabla, id, patch) {
      const row = data[tabla].find((r) => r.id === Number(id));
      if (!row) return null;
      Object.assign(row, patch);
      return clone(row);
    },
    async remove(tabla, id) {
      const i = data[tabla].findIndex((r) => r.id === Number(id));
      if (i >= 0) data[tabla].splice(i, 1);
      return i >= 0;
    },
  };

  if (conDatos) {
    const hash = bcrypt.hashSync(seed.DEMO_PASSWORD, 8);
    seed.usuarios.forEach((u) => repo.insert('usuarios', { ...u, password_hash: hash, activo: true }));
    seed.pinturas.forEach((p) => repo.insert('pinturas', { ...p, activo: true }));
  }
  return repo;
}

module.exports = { createMemoryRepo };
