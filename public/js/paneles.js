// Paneles de trabajo: pintor y administrador
const MENU_PANEL = {
  pintor: { titulo: 'Panel del pintor', enlaces: [['#/pintor', 'Solicitudes disponibles'], ['#/pintor/trabajos', 'Mis trabajos'], ['#/', 'Ver tienda']] },
  admin: { titulo: 'Administración', enlaces: [['#/admin', 'Indicadores'], ['#/admin/inventario', 'Inventario'], ['#/admin/solicitudes', 'Solicitudes'], ['#/admin/usuarios', 'Usuarios'], ['#/', 'Ver tienda']] },
};

function marcoPanel(rol, ruta, html, contadores = {}) {
  const m = MENU_PANEL[rol];
  vista().innerHTML = `
    <div class="panel">
      <nav class="panel-menu"><span class="titulo-panel">${m.titulo}</span>
        ${m.enlaces.map(([h, t]) => `<a href="${h}" class="${h === ruta ? 'activo' : ''}">${t}${contadores[h] ? `<span>${contadores[h]}</span>` : ''}</a>`).join('')}
      </nav>
      <div class="panel-cuerpo">${html}</div>
    </div>`;
}

const barra = (nombre, valor, max, color) => `
  <div class="barra"><span class="nom">${color ? `<i style="background:${esc(color)}"></i>` : ''}${esc(nombre)}</span>
  <div class="pista"><div class="relleno" style="width:${(valor / Math.max(max, 1)) * 100}%"></div></div><span class="num">${valor}</span></div>`;

// ===================================================================
// PINTOR
// ===================================================================
const Pintor = {
  async disponibles() {
    const lista = await api('/solicitudes/disponibles');
    marcoPanel('pintor', '#/pintor', `
      <div class="pagina-cab"><span class="sobretitulo">Nuevas oportunidades</span><h1>Solicitudes disponibles</h1><p>Acepta una solicitud para asignártela. La pintura ya está reservada en bodega.</p></div>
      <div class="lista">${lista.length ? lista.map((s) => `
        <article class="fila-item">
          ${escena({ color_hex: s.pintura?.color_hex, id: s.pintura_id })}
          <div>
            <h3>${s.metros_cuadrados} m² · ${esc(s.pintura?.nombre)}</h3>
            <div class="meta">${s.manos} ${s.manos === 1 ? 'mano' : 'manos'} · ${s.galones} galones · ${esc(s.direccion)}</div>
            <div class="meta">Cliente: ${esc(s.cliente?.nombre)} · Fecha deseada: ${esc(s.fecha_deseada || 'flexible')} · Publicada ${fecha(s.created_at)}</div>
            ${s.descripcion ? `<div class="meta" style="color:var(--tinta)">“${esc(s.descripcion)}”</div>` : ''}
          </div>
          <div class="acciones"><button class="btn negro" data-aceptar="${s.id}">Aceptar trabajo</button></div>
        </article>`).join('') : '<div class="vacio"><h3>Todo al día</h3><p>No hay solicitudes pendientes en este momento.</p></div>'}</div>`,
      { '#/pintor': lista.length });
    $$('[data-aceptar]').forEach((b) => b.addEventListener('click', async () => {
      try { await api(`/solicitudes/${b.dataset.aceptar}/aceptar`, { method: 'PATCH' }); toast('¡Trabajo aceptado! Contacta al cliente para agendar.'); location.hash = '#/pintor/trabajos'; }
      catch (err) { toast(err.message, true); this.disponibles(); }
    }));
  },

  async trabajos() {
    const lista = await api('/solicitudes/mis');
    const notas = lista.filter((s) => s.calificacion).map((s) => s.calificacion.puntuacion);
    const prom = notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : 0;
    const activos = lista.filter((s) => ['aceptada', 'en_proceso'].includes(s.estado));
    marcoPanel('pintor', '#/pintor/trabajos', `
      <div class="pagina-cab"><span class="sobretitulo">Hola, ${esc(Sesion.usuario.nombre.split(' ')[0])}</span><h1>Mis trabajos</h1></div>
      <div class="kpis">
        <div class="kpi negro"><div class="valor">${activos.length}</div><div class="etq">Trabajos activos</div></div>
        <div class="kpi"><div class="valor">${lista.filter((s) => s.estado === 'completada').length}</div><div class="etq">Completados</div></div>
        <div class="kpi"><div class="valor">${prom ? prom.toFixed(1) : '—'}</div><div class="etq">Calificación promedio</div></div>
        <div class="kpi"><div class="valor">${notas.length}</div><div class="etq">Opiniones recibidas</div></div>
      </div>
      <div class="lista">${lista.length ? lista.map((s) => {
        const paso = ORDEN_ESTADO.indexOf(s.estado);
        return `
        <article class="fila-item">
          ${escena({ color_hex: s.pintura?.color_hex, id: s.pintura_id })}
          <div>
            <h3>${esc(s.pintura?.nombre)} ${chipEstado(s.estado)}</h3>
            <div class="meta">${s.metros_cuadrados} m² · ${s.manos} ${s.manos === 1 ? 'mano' : 'manos'} · ${s.galones} galones</div>
            <div class="meta">${esc(s.cliente?.nombre)} · ${esc(s.cliente?.telefono || 'sin teléfono')} · ${esc(s.direccion)}</div>
            <div class="progreso">${ORDEN_ESTADO.map((_, i) => `<i class="${i <= paso ? 'on' : ''}"></i>`).join('')}</div>
            ${s.calificacion ? `<div class="meta" style="margin-top:10px"><span class="estrellas">${estrellas(s.calificacion.puntuacion)}</span> “${esc(s.calificacion.comentario || 'Sin comentario')}”</div>` : ''}
          </div>
          <div class="acciones">
            ${s.estado === 'aceptada' ? `<button class="btn negro" data-accion="iniciar" data-id="${s.id}">Iniciar trabajo</button>` : ''}
            ${s.estado === 'en_proceso' ? `<button class="btn negro" data-accion="completar" data-id="${s.id}">Marcar terminado</button>` : ''}
          </div>
        </article>`;
      }).join('') : '<div class="vacio"><h3>Sin trabajos todavía</h3><p>Acepta una solicitud para empezar.</p><a class="btn negro" href="#/pintor">Ver disponibles</a></div>'}</div>`);
    $$('[data-accion]').forEach((b) => b.addEventListener('click', async () => {
      try { await api(`/solicitudes/${b.dataset.id}/${b.dataset.accion}`, { method: 'PATCH' }); toast(b.dataset.accion === 'iniciar' ? 'Trabajo en proceso' : '¡Trabajo terminado! El cliente ya puede calificarte.'); this.trabajos(); }
      catch (err) { toast(err.message, true); }
    }));
  },
};

// ===================================================================
// ADMINISTRADOR
// ===================================================================
const Admin = {
  async indicadores() {
    const [e, pinturas] = await Promise.all([api('/admin/estadisticas'), api('/admin/pinturas')]);
    const r = e.resumen;
    const colorDe = Object.fromEntries(pinturas.map((p) => [p.id, p.color_hex]));
    const maxGal = Math.max(...e.top_pinturas.map((p) => p.galones), 1);
    const maxEst = Math.max(...Object.values(e.solicitudes_por_estado), 1);
    const maxCal = Math.max(...e.distribucion_calificaciones.map((d) => d.cantidad), 1);
    marcoPanel('admin', '#/admin', `
      <div class="pagina-cab"><span class="sobretitulo">Resumen del negocio</span><h1>Indicadores</h1></div>
      <div class="kpis">
        <div class="kpi negro"><div class="valor">${pesos(r.ventas_totales)}</div><div class="etq">Ventas totales</div></div>
        <div class="kpi"><div class="valor">${r.pedidos}</div><div class="etq">Compras directas</div></div>
        <div class="kpi"><div class="valor">${r.solicitudes}</div><div class="etq">Servicios · ${r.tasa_completadas_pct}% completados</div></div>
        <div class="kpi"><div class="valor">${r.calificacion_promedio || '—'}<span style="font-size:20px"> / 5</span></div><div class="etq">Calificación media · ${r.total_calificaciones} opiniones</div></div>
      </div>
      ${e.stock_bajo.length ? `<div class="tarjeta" style="margin-bottom:16px;border-color:#f3c2b6;background:#fff7f4"><h3 style="margin-bottom:10px">Reabastecer pronto</h3>
        <div style="display:flex;gap:10px;flex-wrap:wrap">${e.stock_bajo.map((s) => `<a class="pildora" href="#/admin/inventario"><span class="muestra" style="background:${esc(colorDe[s.id] || '#ddd')}"></span>${esc(s.nombre)} · ${s.stock_galones}/${s.stock_minimo} gal</a>`).join('')}</div></div>` : ''}
      <div class="dos-col">
        <div class="tarjeta"><h3>Galones vendidos por color</h3><div class="barras">${e.top_pinturas.length ? e.top_pinturas.map((p) => barra(p.nombre, p.galones, maxGal, colorDe[p.pintura_id])).join('') : '<p class="meta">Aún no hay ventas.</p>'}</div></div>
        <div class="tarjeta"><h3>Solicitudes por estado</h3><div class="barras">${Object.entries(e.solicitudes_por_estado).map(([k, v]) => barra(ETIQUETA_ESTADO[k], v, maxEst)).join('')}</div></div>
      </div>
      <div class="dos-col">
        <div class="tarjeta"><h3>Ranking de pintores</h3><table class="tabla"><thead><tr><th>Pintor</th><th>Promedio</th><th>Opiniones</th><th>Terminados</th></tr></thead>
          <tbody>${e.ranking_pintores.map((p) => `<tr><td><b>${esc(p.nombre)}</b></td><td><span class="estrellas">${estrellas(p.promedio)}</span> ${p.promedio || '—'}</td><td>${p.calificaciones}</td><td>${p.completadas}</td></tr>`).join('')}</tbody></table></div>
        <div class="tarjeta"><h3>Distribución de calificaciones</h3><div class="barras">${[...e.distribucion_calificaciones].reverse().map((d) => barra('★'.repeat(d.estrellas), d.cantidad, maxCal)).join('')}</div>
          <p class="meta" style="margin-top:18px;color:var(--suave);font-size:13px">Área media solicitada: ${e.area_m2.media} m² (mediana ${e.area_m2.mediana}). Tiempo medio hasta aceptación: ${e.horas_hasta_aceptacion.media} h.</p></div>
      </div>`);
  },

  async inventario() {
    const pinturas = await api('/admin/pinturas');
    marcoPanel('admin', '#/admin/inventario', `
      <div class="seccion-cab" style="margin-bottom:28px"><div><span class="sobretitulo">${pinturas.length} productos</span><h2 style="font-size:clamp(36px,4vw,56px)">Inventario</h2></div><button class="btn negro" id="nueva">+ Nueva pintura</button></div>
      <div class="tarjeta tabla-wrap" style="padding:8px 16px">
        <table class="tabla">
          <thead><tr><th></th><th>Producto</th><th>Tipo</th><th>Precio / gal</th><th>Rinde</th><th>Stock</th><th>Estado</th><th></th></tr></thead>
          <tbody>${pinturas.map((p) => `<tr>
            <td><div class="muestra-tabla" style="background:${esc(p.color_hex)}"></div></td>
            <td><b>${esc(p.nombre)}</b><div style="color:var(--suave);font-size:12px;text-transform:capitalize">${esc(p.acabado)} · ${esc(p.uso)}</div></td>
            <td style="text-transform:capitalize">${esc(p.tipo)}</td>
            <td>${pesos(p.precio_galon)}</td><td>${p.rendimiento_m2_gal} m²</td>
            <td><b>${p.stock_galones}</b> ${p.stock_galones <= p.stock_minimo ? '<span class="estado bajo">bajo</span>' : ''}</td>
            <td>${p.activo ? '<span class="estado completada">Activo</span>' : '<span class="estado">Inactivo</span>'}</td>
            <td><div class="acciones-tabla">
              <button class="btn chico" data-stock="${p.id}">Stock ±</button>
              <button class="btn chico" data-editar="${p.id}">Editar</button>
              ${p.activo ? `<button class="btn chico peligro" data-borrar="${p.id}">Ocultar</button>` : `<button class="btn chico" data-activar="${p.id}">Activar</button>`}
            </div></td></tr>`).join('')}</tbody>
        </table>
      </div>`);
    const buscar = (id) => pinturas.find((p) => p.id === Number(id));
    $('#nueva').addEventListener('click', () => this.formPintura());
    $$('[data-editar]').forEach((b) => b.addEventListener('click', () => this.formPintura(buscar(b.dataset.editar))));
    $$('[data-stock]').forEach((b) => b.addEventListener('click', () => {
      const p = buscar(b.dataset.stock);
      const m = modal(`
        <div style="width:64px;height:64px;border-radius:50%;background:${esc(p.color_hex)};box-shadow:inset 0 0 0 1px rgba(0,0,0,.1);margin-bottom:16px"></div>
        <h2>Ajustar stock</h2><p class="sub">${esc(p.nombre)} · actualmente <b>${p.stock_galones} galones</b></p>
        <form class="form" id="f-stock">
          <label class="campo">Cantidad <span class="ayuda">positiva para ingresar, negativa para descontar</span><input type="number" name="cantidad" value="20" required /></label>
          <button class="btn negro ancho">Guardar</button>
        </form>`);
      $('#f-stock', m.el).addEventListener('submit', async (e) => {
        e.preventDefault();
        try { await api(`/admin/pinturas/${p.id}/stock`, { method: 'PATCH', body: { cantidad: Number(datosForm(e.target).cantidad) } }); m.cerrar(); toast('Stock actualizado'); this.inventario(); }
        catch (err) { toast(err.message, true); }
      });
    }));
    $$('[data-borrar]').forEach((b) => b.addEventListener('click', async () => {
      if (!confirmarAccion(b, '¿Seguro?')) return;
      try { await api(`/admin/pinturas/${b.dataset.borrar}`, { method: 'DELETE' }); toast('Producto oculto del catálogo'); this.inventario(); } catch (err) { toast(err.message, true); }
    }));
    $$('[data-activar]').forEach((b) => b.addEventListener('click', async () => {
      try { await api(`/admin/pinturas/${b.dataset.activar}`, { method: 'PUT', body: { activo: true } }); toast('Producto visible en el catálogo'); this.inventario(); } catch (err) { toast(err.message, true); }
    }));
  },

  formPintura(p = null) {
    const v = p || { tipo: 'vinilo', acabado: 'mate', uso: 'interior', color_hex: '#E8DCC8', stock_minimo: 5, stock_galones: 20, rendimiento_m2_gal: 35 };
    const opt = (lista, actual) => lista.map((o) => `<option ${o === actual ? 'selected' : ''}>${o}</option>`).join('');
    const m = modal(`
      <h2>${p ? 'Editar pintura' : 'Nueva pintura'}</h2><p class="sub">Los cambios se reflejan de inmediato en la tienda.</p>
      <form class="form" id="f-pint">
        <div style="display:grid;grid-template-columns:120px 1fr;gap:18px;align-items:end">
          <label class="campo">Color<input type="color" name="color_hex" value="${esc(v.color_hex)}" style="height:52px;padding:4px" /></label>
          <label class="campo">Nombre del color<input name="color" required value="${esc(v.color || '')}" placeholder="Ej: Verde salvia" /></label>
        </div>
        <label class="campo">Nombre del producto<input name="nombre" required value="${esc(v.nombre || '')}" placeholder="Ej: Vinilo Tipo 1 Verde Salvia" /></label>
        <div class="fila-campos">
          <label class="campo">Tipo<select name="tipo">${opt(['vinilo', 'esmalte', 'impermeabilizante', 'anticorrosivo', 'laca', 'otro'], v.tipo)}</select></label>
          <label class="campo">Acabado<select name="acabado">${opt(['mate', 'satinado', 'brillante'], v.acabado)}</select></label>
        </div>
        <div class="fila-campos">
          <label class="campo">Uso<select name="uso">${opt(['interior', 'exterior', 'mixto'], v.uso)}</select></label>
          <label class="campo">Precio por galón (COP)<input type="number" name="precio_galon" min="0" required value="${esc(v.precio_galon ?? '')}" /></label>
        </div>
        <div class="fila-campos">
          <label class="campo">Rendimiento (m²/galón)<input type="number" name="rendimiento_m2_gal" min="1" step="0.1" required value="${esc(v.rendimiento_m2_gal)}" /></label>
          <label class="campo">Stock mínimo<input type="number" name="stock_minimo" min="0" value="${esc(v.stock_minimo)}" /></label>
        </div>
        ${p ? '' : `<label class="campo">Stock inicial (galones)<input type="number" name="stock_galones" min="0" required value="${esc(v.stock_galones)}" /></label>`}
        <label class="campo">Descripción<textarea name="descripcion" rows="2">${esc(v.descripcion || '')}</textarea></label>
        <button class="btn negro ancho">Guardar</button>
      </form>`, { ancho: true });
    $('#f-pint', m.el).addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = datosForm(e.target);
      ['precio_galon', 'rendimiento_m2_gal', 'stock_galones', 'stock_minimo'].forEach((k) => { if (d[k] !== undefined) d[k] = Number(d[k]); });
      try { await api(p ? `/admin/pinturas/${p.id}` : '/admin/pinturas', { method: p ? 'PUT' : 'POST', body: d }); m.cerrar(); toast('Pintura guardada'); this.inventario(); }
      catch (err) { toast(err.message, true); }
    });
  },

  async solicitudes() {
    const [lista, usuarios, pinturas] = await Promise.all([api('/admin/solicitudes'), api('/admin/usuarios'), api('/admin/pinturas')]);
    const u = Object.fromEntries(usuarios.map((x) => [x.id, x.nombre]));
    const p = Object.fromEntries(pinturas.map((x) => [x.id, x]));
    marcoPanel('admin', '#/admin/solicitudes', `
      <div class="pagina-cab"><span class="sobretitulo">${lista.length} en total</span><h1>Solicitudes</h1></div>
      <div class="tarjeta tabla-wrap" style="padding:8px 16px"><table class="tabla">
        <thead><tr><th>#</th><th>Cliente</th><th>Pintor</th><th>Pintura</th><th>m²</th><th>Galones</th><th>Costo</th><th>Estado</th><th>Fecha</th></tr></thead>
        <tbody>${lista.map((s) => `<tr><td>${s.id}</td><td>${esc(u[s.cliente_id])}</td><td>${esc(u[s.pintor_id] || '—')}</td>
          <td><span style="display:inline-flex;gap:8px;align-items:center"><i style="width:14px;height:14px;border-radius:50%;background:${esc(p[s.pintura_id]?.color_hex)};box-shadow:inset 0 0 0 1px rgba(0,0,0,.1)"></i>${esc(p[s.pintura_id]?.nombre)}</span></td>
          <td>${s.metros_cuadrados}</td><td>${s.galones}</td><td>${pesos(s.costo_pintura)}</td><td>${chipEstado(s.estado)}</td><td>${fecha(s.created_at)}</td></tr>`).join('') || '<tr><td colspan="9" style="text-align:center;color:var(--suave);padding:40px">Sin solicitudes</td></tr>'}</tbody>
      </table></div>`);
  },

  async usuarios() {
    const usuarios = await api('/admin/usuarios');
    marcoPanel('admin', '#/admin/usuarios', `
      <div class="pagina-cab"><span class="sobretitulo">${usuarios.length} cuentas</span><h1>Usuarios</h1></div>
      <div class="tarjeta tabla-wrap" style="padding:8px 16px"><table class="tabla">
        <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Teléfono</th><th>Estado</th><th></th></tr></thead>
        <tbody>${usuarios.map((x) => `<tr><td><b>${esc(x.nombre)}</b></td><td>${esc(x.email)}</td><td><span class="chip-rol">${esc(x.rol)}</span></td><td>${esc(x.telefono || '—')}</td>
          <td>${x.activo ? '<span class="estado completada">Activo</span>' : '<span class="estado cancelada">Inactivo</span>'}</td>
          <td><div class="acciones-tabla">${x.id === Sesion.usuario.id ? '' : `<button class="btn chico ${x.activo ? 'peligro' : ''}" data-u="${x.id}" data-a="${x.activo ? 0 : 1}">${x.activo ? 'Desactivar' : 'Activar'}</button>`}</div></td></tr>`).join('')}</tbody>
      </table></div>`);
    $$('[data-u]').forEach((b) => b.addEventListener('click', async () => {
      try { await api(`/admin/usuarios/${b.dataset.u}/activo`, { method: 'PATCH', body: { activo: b.dataset.a === '1' } }); this.usuarios(); } catch (err) { toast(err.message, true); }
    }));
  },
};
