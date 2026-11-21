// Implementación del repositorio sobre Supabase (PostgreSQL).
const { createClient } = require('@supabase/supabase-js');

function createSupabaseRepo({ url, key }) {
  if (!url || !key) {
    throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el archivo .env');
  }
  const sb = createClient(url, key, { auth: { persistSession: false } });

  const check = ({ data, error }) => {
    if (error) {
      const err = new Error(`Error de base de datos: ${error.message}`);
      err.status = 500;
      throw err;
    }
    return data;
  };
  const aplicarFiltros = (query, where) => {
    Object.entries(where).forEach(([k, v]) => {
      query = Array.isArray(v) ? query.in(k, v) : v === null ? query.is(k, null) : query.eq(k, v);
    });
    return query;
  };
  // Postgres devuelve numeric como string: se normalizan a número
  const NUMERICOS = ['precio_galon', 'rendimiento_m2_gal', 'total', 'precio_unitario', 'subtotal', 'metros_cuadrados', 'costo_pintura'];
  const normalizar = (row) => {
    if (!row) return row;
    NUMERICOS.forEach((c) => { if (row[c] !== undefined && row[c] !== null) row[c] = Number(row[c]); });
    return row;
  };

  return {
    async insert(tabla, row) {
      return normalizar(check(await sb.from(tabla).insert(row).select().single()));
    },
    async select(tabla, where = {}, opts = {}) {
      let q = aplicarFiltros(sb.from(tabla).select('*'), where);
      if (opts.orderBy) q = q.order(opts.orderBy, { ascending: opts.ascending !== false });
      if (opts.limit) q = q.limit(opts.limit);
      return check(await q).map(normalizar);
    },
    async getById(tabla, id) {
      return normalizar(check(await sb.from(tabla).select('*').eq('id', id).maybeSingle()));
    },
    async findOne(tabla, where) {
      return normalizar(check(await aplicarFiltros(sb.from(tabla).select('*'), where).limit(1).maybeSingle()));
    },
    async update(tabla, id, patch) {
      return normalizar(check(await sb.from(tabla).update(patch).eq('id', id).select().maybeSingle()));
    },
    async remove(tabla, id) {
      check(await sb.from(tabla).delete().eq('id', id));
      return true;
    },
  };
}

module.exports = { createSupabaseRepo };
