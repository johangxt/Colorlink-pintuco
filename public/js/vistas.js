// Vistas por rol: cliente, pintor y administrador
const $ = (sel, root = document) => root.querySelector(sel);
const contenido = () => document.getElementById('contenido');

// ===================================================================
// CLIENTE
// ===================================================================
const Carrito = {
  items() { try { return JSON.parse(localStorage.getItem('pintuco_carrito')) || []; } catch { return []; } },
  guardar(items) { localStorage.setItem('pintuco_carrito', JSON.stringify(items)); App.actualizarMenu(); },
  agregar(p, cantidad) {
    const items = this.items();
    const ex = items.find((i) => i.pintura_id === p.id);
    if (ex) ex.cantidad += cantidad; else items.push({ pintura_id: p.id, nombre: p.nombre, precio: p.precio_galon, color_hex: p.color_hex, cantidad });
    this.guardar(items);
  },
  total() { return this.items().reduce((s, i) => s + i.precio * i.cantidad, 0); },
  unidades() { return this.items().reduce((s, i) => s + i.cantidad, 0); },
};

const VistasCliente = {
  async catalogo() {
    const c = contenido();
    c.innerHTML = `
      <div class="encabezado">
        <div><h2>Catálogo de pinturas</h2><p>Precios por galón. Usa la calculadora en "Solicitar servicio" para saber cuánto necesitas.</p></div>
        <div class="filtros">
          <input id="f-q" placeholder="Buscar color o nombre" />
          <select id="f-tipo"><option value="">Todos los tipos</option><option>vinilo</option><option>esmalte</option><option>impermeabilizante</option><option>anticorrosivo</option></select>
          <select id="f-uso"><option value="">Interior y exterior</option><option value="interior">Interior</option><option value="exterior">Exterior</option></select>
        </div>
      </div>
      <div id="grid" class="grid"></div>`;
    const cargar = async () => {
      const qs = new URLSearchParams({ q: $('#f-q').value, tipo: $('#f-tipo').value, uso: $('#f-uso').value });
      const pinturas = await api(`/pinturas?${qs}`);
      $('#grid').innerHTML = pinturas.length ? pinturas.map((p) => `
        <article class="card producto">
          <div class="swatch" style="background:${esc(p.color_hex)}"><span class="chip">${esc(p.tipo)}</span></div>
          <h3>${esc(p.nombre)}</h3>
          <div class="meta">${esc(p.acabado)} · ${esc(p.uso)} · rinde ${esc(p.rendimiento_m2_gal)} m²/gal</div>
          <div class="meta">${esc(p.descripcion || '')}</div>
          <div class="precio">${pesos(p.precio_galon)} <small class="meta">/ galón</small></div>
          <div class="meta">${p.stock_galones > 0 ? `${p.stock_galones} galones disponibles` : '<span class="chip cancelada">Agotado</span>'}</div>
          <div class="fila">
            <input type="number" min="1" max="${p.stock_galones}" value="1" data-cant="${p.id}" ${p.stock_galones ? '' : 'disabled'} />
            <button class="btn primario" data-agregar="${p.id}" ${p.stock_galones ? '' : 'disabled'}>Agregar</button>
          </div>
        </article>`).join('') : '<p class="vacio">No hay productos con esos filtros.</p>';
      $('#grid').querySelectorAll('[data-agregar]').forEach((b) => b.addEventListener('click', () => {
        const p = pinturas.find((x) => x.id === Number(b.dataset.agregar));
        const cant = Number($(`[data-cant="${p.id}"]`).value) || 1;
        Carrito.agregar(p, cant);
        toast(`${cant} galón(es) de ${p.nombre} agregados al carrito`);
      }));
    };
    let t;
    $('#f-q').addEventListener('input', () => { clearTimeout(t); t = setTimeout(cargar, 250); });
    $('#f-tipo').addEventListener('change', cargar);
    $('#f-uso').addEventListener('change', cargar);
    await cargar();
  },

  async carrito() {
    const items = Carrito.items();
    const c = contenido();
    if (!items.length) { c.innerHTML = '<div class="card vacio"><h2>Tu carrito está vacío</h2><p>Agrega pinturas desde el catálogo.</p></div>'; return; }
    c.innerHTML = `
      <div class="encabezado"><h2>Carrito de compras</h2></div>
      <div class="dos-col">
        <div class="card tabla-wrap"><table class="tabla">
          <thead><tr><th></th><th>Producto</th><th>Precio</th><th>Galones</th><th>Subtotal</th><th></th></tr></thead>
          <tbody>${items.map((i, idx) => `<tr>
            <td><span class="swatch" style="display:block;width:28px;height:28px;background:${esc(i.color_hex)}"></span></td>
            <td>${esc(i.nombre)}</td><td>${pesos(i.precio)}</td>
            <td><input type="number" min="1" value="${i.cantidad}" data-idx="${idx}" style="width:70px" /></td>
            <td>${pesos(i.precio * i.cantidad)}</td>
            <td><button class="btn chico peligro" data-quitar="${idx}">Quitar</button></td></tr>`).join('')}
          </tbody></table></div>
        <form id="form-compra" class="card form">
          <h3>Total: ${pesos(Carrito.total())}</h3>
          <label>Dirección de envío<textarea name="direccion_envio" required minlength="5" rows="3"></textarea></label>
          <p class="ayuda">Pago simulado para fines académicos.</p>
          <button class="btn primario">Finalizar compra</button>
        </form>
      </div>`;
    c.querySelectorAll('[data-idx]').forEach((inp) => inp.addEventListener('change', () => {
      const its = Carrito.items(); its[inp.dataset.idx].cantidad = Math.max(1, Number(inp.value) || 1); Carrito.guardar(its); this.carrito();
    }));
    c.querySelectorAll('[data-quitar]').forEach((b) => b.addEventListener('click', () => {
      const its = Carrito.items(); its.splice(Number(b.dataset.quitar), 1); Carrito.guardar(its); this.carrito();
    }));
    $('#form-compra').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const pedido = await api('/pedidos', { method: 'POST', body: { ...datosForm(e.target), items: Carrito.items().map(({ pintura_id, cantidad }) => ({ pintura_id, cantidad })) } });
        Carrito.guardar([]);
        toast(`Pedido #${pedido.id} realizado por ${pesos(pedido.total)}`);
        App.ir('pedidos');
      } catch (err) { toast(err.message, true); }
    });
  },

  async solicitar() {
    const pinturas = await api('/pinturas');
    const c = contenido();
    c.innerHTML = `
      <div class="encabezado"><div><h2>Solicitar servicio de pintura</h2><p>Indica el área y calculamos automáticamente los galones necesarios. Un pintor aceptará tu solicitud.</p></div></div>
      <div class="dos-col">
        <form id="form-sol" class="card form">
          <label>Pintura<select name="pintura_id" required>${pinturas.map((p) => `<option value="${p.id}">${esc(p.nombre)} — ${pesos(p.precio_galon)}/gal</option>`).join('')}</select></label>
          <div class="form-grid">
            <label>Metros cuadrados (m²)<input type="number" name="metros_cuadrados" min="1" step="0.1" value="40" required /></label>
            <label>Número de manos<select name="manos"><option>1</option><option selected>2</option><option>3</option></select></label>
          </div>
          <label>Dirección del inmueble<input name="direccion" required minlength="5" /></label>
          <label>Fecha deseada<input type="date" name="fecha_deseada" /></label>
          <label>Descripción del trabajo<textarea name="descripcion" rows="3" placeholder="Ej: sala y comedor, paredes con algo de humedad"></textarea></label>
          <button class="btn primario">Enviar solicitud</button>
        </form>
        <div id="calc" class="card resultado-calc"></div>
      </div>`;
    const form = $('#form-sol');
    const recalcular = async () => {
      const d = datosForm(form);
      if (!(Number(d.metros_cuadrados) > 0)) { $('#calc').innerHTML = '<p>Ingresa los metros cuadrados.</p>'; return; }
      try {
        const r = await api('/pinturas/calcular', { method: 'POST', body: { pintura_id: Number(d.pintura_id), metros_cuadrados: Number(d.metros_cuadrados), manos: Number(d.manos) } });
        $('#calc').innerHTML = `
          <div>Necesitas</div><div class="grande">${r.galones} galones</div>
          <div>${r.litros} litros · costo estimado <strong>${pesos(r.costo_estimado)}</strong></div>
          <dl>
            <dt>Área</dt><dd>${r.metros_cuadrados} m² × ${r.manos} mano(s)</dd>
            <dt>Rendimiento</dt><dd>${r.rendimiento_m2_gal} m² por galón</dd>
            <dt>Cálculo exacto</dt><dd>${r.galones_exactos} gal (+${r.desperdicio_pct}% desperdicio)</dd>
            <dt>Disponibilidad</dt><dd>${r.stock_suficiente ? 'Hay inventario suficiente ✔' : `⚠ Solo hay ${r.pintura.stock_galones} galones`}</dd>
          </dl>`;
      } catch (err) { $('#calc').innerHTML = `<p>${esc(err.message)}</p>`; }
    };
    form.addEventListener('input', recalcular);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = datosForm(form);
      try {
        const s = await api('/solicitudes', { method: 'POST', body: { ...d, pintura_id: Number(d.pintura_id), metros_cuadrados: Number(d.metros_cuadrados), manos: Number(d.manos) } });
        toast(`Solicitud #${s.id} creada: ${s.galones} galones. Un pintor la revisará pronto.`);
        App.ir('misSolicitudes');
      } catch (err) { toast(err.message, true); }
    });
    recalcular();
  },

  async misSolicitudes() {
    const lista = await api('/solicitudes/mis');
    const c = contenido();
    c.innerHTML = `<div class="encabezado"><h2>Mis solicitudes de servicio</h2></div>
      <div class="lista">${lista.length ? lista.map((s) => `
        <article class="card item">
          <div>
            <h3>#${s.id} · ${esc(s.pintura?.nombre)} ${chipEstado(s.estado)}</h3>
            <div class="meta">${s.metros_cuadrados} m² · ${s.manos} mano(s) · <strong>${s.galones} galones</strong> · ${pesos(s.costo_pintura)}</div>
            <div class="meta">${esc(s.direccion)} · creada ${fecha(s.created_at)}</div>
            <div class="meta">Pintor: ${s.pintor ? `${esc(s.pintor.nombre)} (${esc(s.pintor.telefono || 's/t')})` : 'aún sin asignar'}</div>
            ${s.calificacion ? `<div>Tu calificación: <span class="estrellas">${estrellas(s.calificacion.puntuacion)}</span> ${esc(s.calificacion.comentario || '')}</div>` : ''}
          </div>
          <div class="acciones">
            ${s.estado === 'pendiente' ? `<button class="btn chico peligro" data-cancelar="${s.id}">Cancelar</button>` : ''}
            ${s.estado === 'completada' && !s.calificacion ? `<button class="btn chico acento" data-calificar="${s.id}">Calificar pintor</button>` : ''}
          </div>
        </article>`).join('') : '<p class="card vacio">Aún no tienes solicitudes.</p>'}</div>`;
    c.querySelectorAll('[data-cancelar]').forEach((b) => b.addEventListener('click', async () => {
      if (!confirmarAccion('¿Cancelar esta solicitud?', b)) return;
      try { await api(`/solicitudes/${b.dataset.cancelar}/cancelar`, { method: 'PATCH' }); toast('Solicitud cancelada'); this.misSolicitudes(); } catch (err) { toast(err.message, true); }
    }));
    c.querySelectorAll('[data-calificar]').forEach((b) => b.addEventListener('click', () => this.calificar(Number(b.dataset.calificar))));
  },

  calificar(id) {
    let puntos = 5;
    const m = modal(`<h3>Califica la atención del pintor</h3>
      <form class="form" id="form-cal">
        <div class="selector-estrellas">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-n="${n}" class="on">★</button>`).join('')}</div>
        <label>Comentario (opcional)<textarea name="comentario" rows="3" placeholder="¿Cómo fue el trabajo?"></textarea></label>
        <div class="fila"><button class="btn primario">Enviar calificación</button><button type="button" class="btn" id="cal-cancel">Cancelar</button></div>
      </form>`);
    const pintar = () => m.el.querySelectorAll('[data-n]').forEach((b) => b.classList.toggle('on', Number(b.dataset.n) <= puntos));
    m.el.querySelectorAll('[data-n]').forEach((b) => b.addEventListener('click', () => { puntos = Number(b.dataset.n); pintar(); }));
    $('#cal-cancel', m.el).addEventListener('click', m.cerrar);
    $('#form-cal', m.el).addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await api(`/solicitudes/${id}/calificar`, { method: 'POST', body: { puntuacion: puntos, comentario: datosForm(e.target).comentario } });
        m.cerrar(); toast('¡Gracias por tu calificación!'); this.misSolicitudes();
      } catch (err) { toast(err.message, true); }
    });
  },

  async pedidos() {
    const pedidos = await api('/pedidos/mis');
    contenido().innerHTML = `<div class="encabezado"><h2>Mis compras</h2></div>
      <div class="lista">${pedidos.length ? pedidos.map((p) => `
        <article class="card">
          <h3>Pedido #${p.id} · ${pesos(p.total)} <span class="chip ${esc(p.estado)}">${esc(p.estado)}</span></h3>
          <div class="meta">${fecha(p.created_at)} · Envío a: ${esc(p.direccion_envio)}</div>
          <ul>${p.items.map((i) => `<li>${i.cantidad} gal × ${esc(i.nombre)} — ${pesos(i.subtotal)}</li>`).join('')}</ul>
        </article>`).join('') : '<p class="card vacio">Aún no has realizado compras.</p>'}</div>`;
  },
};

// ===================================================================
// PINTOR
// ===================================================================
const VistasPintor = {
  async disponibles() {
    const lista = await api('/solicitudes/disponibles');
    const c = contenido();
    c.innerHTML = `<div class="encabezado"><div><h2>Solicitudes disponibles</h2><p>Acepta una solicitud para asignártela y gestionarla.</p></div></div>
      <div class="lista">${lista.length ? lista.map((s) => `
        <article class="card item">
          <div>
            <h3>#${s.id} · ${s.metros_cuadrados} m² ${chipEstado(s.estado)}</h3>
            <div class="meta"><span class="swatch" style="display:inline-block;width:12px;height:12px;vertical-align:middle;background:${esc(s.pintura?.color_hex)}"></span> ${esc(s.pintura?.nombre)} · ${s.manos} mano(s) · ${s.galones} galones</div>
            <div class="meta">${esc(s.direccion)} · Fecha deseada: ${esc(s.fecha_deseada || 'flexible')}</div>
            <div class="meta">Cliente: ${esc(s.cliente?.nombre)}</div>
            ${s.descripcion ? `<p>${esc(s.descripcion)}</p>` : ''}
          </div>
          <div class="acciones"><button class="btn primario" data-aceptar="${s.id}">Aceptar</button></div>
        </article>`).join('') : '<p class="card vacio">No hay solicitudes pendientes en este momento.</p>'}</div>`;
    c.querySelectorAll('[data-aceptar]').forEach((b) => b.addEventListener('click', async () => {
      try { await api(`/solicitudes/${b.dataset.aceptar}/aceptar`, { method: 'PATCH' }); toast('Solicitud aceptada. Gestiónala en "Mis trabajos".'); App.ir('trabajos'); } catch (err) { toast(err.message, true); this.disponibles(); }
    }));
  },

  async trabajos() {
    const lista = await api('/solicitudes/mis');
    const notas = lista.filter((s) => s.calificacion).map((s) => s.calificacion.puntuacion);
    const prom = notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : 0;
    const c = contenido();
    c.innerHTML = `
      <div class="kpis">
        <div class="card kpi"><div class="valor">${lista.filter((s) => ['aceptada', 'en_proceso'].includes(s.estado)).length}</div><div class="etq">Trabajos activos</div></div>
        <div class="card kpi"><div class="valor">${lista.filter((s) => s.estado === 'completada').length}</div><div class="etq">Completados</div></div>
        <div class="card kpi"><div class="valor">${prom ? prom.toFixed(2) : '—'} <span class="estrellas" style="font-size:1rem">${prom ? estrellas(prom) : ''}</span></div><div class="etq">Calificación promedio (${notas.length})</div></div>
      </div>
      <div class="lista">${lista.length ? lista.map((s) => `
        <article class="card item">
          <div>
            <h3>#${s.id} · ${esc(s.pintura?.nombre)} ${chipEstado(s.estado)}</h3>
            <div class="meta">${s.metros_cuadrados} m² · ${s.manos} mano(s) · ${s.galones} galones</div>
            <div class="meta">Cliente: ${esc(s.cliente?.nombre)} · Tel: ${esc(s.cliente?.telefono || '—')} · ${esc(s.direccion)}</div>
            ${s.calificacion ? `<div><span class="estrellas">${estrellas(s.calificacion.puntuacion)}</span> “${esc(s.calificacion.comentario || 'Sin comentario')}”</div>` : ''}
          </div>
          <div class="acciones">
            ${s.estado === 'aceptada' ? `<button class="btn primario" data-accion="iniciar" data-id="${s.id}">Iniciar trabajo</button>` : ''}
            ${s.estado === 'en_proceso' ? `<button class="btn acento" data-accion="completar" data-id="${s.id}">Marcar completado</button>` : ''}
          </div>
        </article>`).join('') : '<p class="card vacio">Todavía no has aceptado solicitudes.</p>'}</div>`;
    c.querySelectorAll('[data-accion]').forEach((b) => b.addEventListener('click', async () => {
      try { await api(`/solicitudes/${b.dataset.id}/${b.dataset.accion}`, { method: 'PATCH' }); toast('Estado actualizado'); this.trabajos(); } catch (err) { toast(err.message, true); }
    }));
  },
};

// ===================================================================
// ADMINISTRADOR
// ===================================================================
const VistasAdmin = {
  async dashboard() {
    const e = await api('/admin/estadisticas');
    const r = e.resumen;
    const maxGal = Math.max(1, ...e.top_pinturas.map((p) => p.galones));
    const maxEst = Math.max(1, ...Object.values(e.solicitudes_por_estado));
    const maxCal = Math.max(1, ...e.distribucion_calificaciones.map((d) => d.cantidad));
    contenido().innerHTML = `
      <div class="encabezado"><h2>Panel de indicadores</h2></div>
      <div class="kpis">
        <div class="card kpi"><div class="valor">${pesos(r.ventas_totales)}</div><div class="etq">Ventas totales</div></div>
        <div class="card kpi"><div class="valor">${r.pedidos}</div><div class="etq">Compras directas</div></div>
        <div class="card kpi"><div class="valor">${r.solicitudes}</div><div class="etq">Solicitudes de servicio</div></div>
        <div class="card kpi"><div class="valor">${r.tasa_completadas_pct}%</div><div class="etq">Solicitudes completadas</div></div>
        <div class="card kpi"><div class="valor">${r.calificacion_promedio || '—'}</div><div class="etq">Calificación promedio (σ ${r.calificacion_desviacion})</div></div>
        <div class="card kpi"><div class="valor">${r.clientes} / ${r.pintores}</div><div class="etq">Clientes / pintores</div></div>
      </div>
      <div class="grid-2">
        <div class="card"><h3>Galones vendidos por pintura</h3><div class="barras">${e.top_pinturas.length ? e.top_pinturas.map((p) => barra(p.nombre, p.galones, maxGal)).join('') : '<p class="meta">Sin ventas aún.</p>'}</div></div>
        <div class="card"><h3>Solicitudes por estado</h3><div class="barras">${Object.entries(e.solicitudes_por_estado).map(([k, v]) => barra(ETIQUETA_ESTADO[k], v, maxEst)).join('')}</div></div>
        <div class="card"><h3>Ranking de pintores</h3><table class="tabla"><thead><tr><th>Pintor</th><th>Promedio</th><th>Calif.</th><th>Completados</th></tr></thead>
          <tbody>${e.ranking_pintores.map((p) => `<tr><td>${esc(p.nombre)}</td><td><span class="estrellas">${estrellas(p.promedio)}</span> ${p.promedio || '—'}</td><td>${p.calificaciones}</td><td>${p.completadas}</td></tr>`).join('')}</tbody></table></div>
        <div class="card"><h3>Distribución de calificaciones</h3><div class="barras">${e.distribucion_calificaciones.map((d) => barra('★'.repeat(d.estrellas), d.cantidad, maxCal)).join('')}</div>
          <p class="meta">Área promedio solicitada: ${e.area_m2.media} m² (mediana ${e.area_m2.mediana} m²). Tiempo medio hasta aceptación: ${e.horas_hasta_aceptacion.media} h.</p></div>
      </div>
      <div class="card" style="margin-top:1rem"><h3>Alertas de inventario</h3>
        ${e.stock_bajo.length ? `<ul>${e.stock_bajo.map((s) => `<li><span class="chip bajo">Stock bajo</span> ${esc(s.nombre)}: ${s.stock_galones} gal (mínimo ${s.stock_minimo})</li>`).join('')}</ul>` : '<p class="meta">Todo el inventario está sobre el mínimo.</p>'}
      </div>`;
  },

  async inventario() {
    const pinturas = await api('/admin/pinturas');
    const c = contenido();
    c.innerHTML = `<div class="encabezado"><div><h2>Inventario de pinturas</h2><p>${pinturas.length} productos registrados</p></div><button class="btn primario" id="nueva">+ Nueva pintura</button></div>
      <div class="card tabla-wrap"><table class="tabla">
        <thead><tr><th></th><th>Nombre</th><th>Tipo</th><th>Precio/gal</th><th>Rend. m²/gal</th><th>Stock</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody>${pinturas.map((p) => `<tr>
          <td><span class="swatch" style="display:block;width:26px;height:26px;background:${esc(p.color_hex)}"></span></td>
          <td>${esc(p.nombre)}<div class="meta">${esc(p.acabado)} · ${esc(p.uso)}</div></td>
          <td>${esc(p.tipo)}</td><td>${pesos(p.precio_galon)}</td><td>${p.rendimiento_m2_gal}</td>
          <td>${p.stock_galones} ${p.stock_galones <= p.stock_minimo ? '<span class="chip bajo">bajo</span>' : ''}</td>
          <td>${p.activo ? '<span class="chip ok">activo</span>' : '<span class="chip cancelada">inactivo</span>'}</td>
          <td class="acciones">
            <button class="btn chico" data-stock="${p.id}">Stock ±</button>
            <button class="btn chico" data-editar="${p.id}">Editar</button>
            ${p.activo ? `<button class="btn chico peligro" data-borrar="${p.id}">Desactivar</button>` : `<button class="btn chico" data-activar="${p.id}">Activar</button>`}
          </td></tr>`).join('')}</tbody></table></div>`;
    $('#nueva').addEventListener('click', () => this.formPintura());
    c.querySelectorAll('[data-editar]').forEach((b) => b.addEventListener('click', () => this.formPintura(pinturas.find((p) => p.id === Number(b.dataset.editar)))));
    c.querySelectorAll('[data-stock]').forEach((b) => b.addEventListener('click', () => {
      const p = pinturas.find((x) => x.id === Number(b.dataset.stock));
      const m = modal(`<h3>Ajustar stock: ${esc(p.nombre)}</h3><p class="meta">Stock actual: ${p.stock_galones} galones</p>
        <form class="form" id="f-stock"><label>Cantidad (positiva para ingresar, negativa para descontar)<input type="number" name="cantidad" value="10" required /></label>
        <div class="fila"><button class="btn primario">Guardar</button><button type="button" class="btn" id="x">Cancelar</button></div></form>`);
      $('#x', m.el).addEventListener('click', m.cerrar);
      $('#f-stock', m.el).addEventListener('submit', async (e) => {
        e.preventDefault();
        try { await api(`/admin/pinturas/${p.id}/stock`, { method: 'PATCH', body: { cantidad: Number(datosForm(e.target).cantidad) } }); m.cerrar(); toast('Stock actualizado'); this.inventario(); } catch (err) { toast(err.message, true); }
      });
    }));
    c.querySelectorAll('[data-borrar]').forEach((b) => b.addEventListener('click', async () => {
      if (!confirmarAccion('¿Desactivar este producto del catálogo?', b)) return;
      try { await api(`/admin/pinturas/${b.dataset.borrar}`, { method: 'DELETE' }); toast('Producto desactivado'); this.inventario(); } catch (err) { toast(err.message, true); }
    }));
    c.querySelectorAll('[data-activar]').forEach((b) => b.addEventListener('click', async () => {
      try { await api(`/admin/pinturas/${b.dataset.activar}`, { method: 'PUT', body: { activo: true } }); toast('Producto activado'); this.inventario(); } catch (err) { toast(err.message, true); }
    }));
  },

  formPintura(p = null) {
    const v = p || { tipo: 'vinilo', acabado: 'mate', uso: 'interior', color_hex: '#FFFFFF', stock_minimo: 5, stock_galones: 0, rendimiento_m2_gal: 35 };
    const opt = (lista, actual) => lista.map((o) => `<option ${o === actual ? 'selected' : ''}>${o}</option>`).join('');
    const m = modal(`<h3>${p ? 'Editar' : 'Nueva'} pintura</h3>
      <form class="form" id="f-pint"><div class="form-grid">
        <label class="full">Nombre<input name="nombre" required value="${esc(v.nombre || '')}" /></label>
        <label>Tipo<select name="tipo">${opt(['vinilo', 'esmalte', 'impermeabilizante', 'anticorrosivo', 'laca', 'otro'], v.tipo)}</select></label>
        <label>Acabado<select name="acabado">${opt(['mate', 'satinado', 'brillante'], v.acabado)}</select></label>
        <label>Uso<select name="uso">${opt(['interior', 'exterior', 'mixto'], v.uso)}</select></label>
        <label>Color<input name="color" required value="${esc(v.color || '')}" /></label>
        <label>Color (muestra)<input type="color" name="color_hex" value="${esc(v.color_hex)}" /></label>
        <label>Precio por galón (COP)<input type="number" name="precio_galon" min="0" required value="${esc(v.precio_galon ?? '')}" /></label>
        <label>Rendimiento (m²/galón)<input type="number" name="rendimiento_m2_gal" min="1" step="0.1" required value="${esc(v.rendimiento_m2_gal)}" /></label>
        ${p ? '' : `<label>Stock inicial (galones)<input type="number" name="stock_galones" min="0" required value="${esc(v.stock_galones)}" /></label>`}
        <label>Stock mínimo<input type="number" name="stock_minimo" min="0" value="${esc(v.stock_minimo)}" /></label>
        <label class="full">Descripción<textarea name="descripcion" rows="2">${esc(v.descripcion || '')}</textarea></label>
      </div><div class="fila"><button class="btn primario">Guardar</button><button type="button" class="btn" id="x">Cancelar</button></div></form>`);
    $('#x', m.el).addEventListener('click', m.cerrar);
    $('#f-pint', m.el).addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = datosForm(e.target);
      ['precio_galon', 'rendimiento_m2_gal', 'stock_galones', 'stock_minimo'].forEach((k) => { if (d[k] !== undefined) d[k] = Number(d[k]); });
      try {
        await api(p ? `/admin/pinturas/${p.id}` : '/admin/pinturas', { method: p ? 'PUT' : 'POST', body: d });
        m.cerrar(); toast('Pintura guardada'); this.inventario();
      } catch (err) { toast(err.message, true); }
    });
  },

  async solicitudes() {
    const [lista, usuarios, pinturas] = await Promise.all([api('/admin/solicitudes'), api('/admin/usuarios'), api('/admin/pinturas')]);
    const u = Object.fromEntries(usuarios.map((x) => [x.id, x.nombre]));
    const p = Object.fromEntries(pinturas.map((x) => [x.id, x.nombre]));
    contenido().innerHTML = `<div class="encabezado"><h2>Todas las solicitudes</h2></div>
      <div class="card tabla-wrap"><table class="tabla"><thead><tr><th>#</th><th>Cliente</th><th>Pintor</th><th>Pintura</th><th>m²</th><th>Galones</th><th>Costo</th><th>Estado</th><th>Fecha</th></tr></thead>
      <tbody>${lista.map((s) => `<tr><td>${s.id}</td><td>${esc(u[s.cliente_id])}</td><td>${esc(u[s.pintor_id] || '—')}</td><td>${esc(p[s.pintura_id])}</td><td>${s.metros_cuadrados}</td><td>${s.galones}</td><td>${pesos(s.costo_pintura)}</td><td>${chipEstado(s.estado)}</td><td>${fecha(s.created_at)}</td></tr>`).join('') || '<tr><td colspan="9" class="vacio">Sin solicitudes</td></tr>'}</tbody></table></div>`;
  },

  async usuarios() {
    const usuarios = await api('/admin/usuarios');
    const c = contenido();
    c.innerHTML = `<div class="encabezado"><h2>Usuarios</h2></div>
      <div class="card tabla-wrap"><table class="tabla"><thead><tr><th>#</th><th>Nombre</th><th>Correo</th><th>Rol</th><th>Teléfono</th><th>Estado</th><th></th></tr></thead>
      <tbody>${usuarios.map((x) => `<tr><td>${x.id}</td><td>${esc(x.nombre)}</td><td>${esc(x.email)}</td><td><span class="chip">${esc(x.rol)}</span></td><td>${esc(x.telefono || '—')}</td>
        <td>${x.activo ? '<span class="chip ok">activo</span>' : '<span class="chip cancelada">inactivo</span>'}</td>
        <td>${x.id === Sesion.usuario.id ? '' : `<button class="btn chico" data-u="${x.id}" data-a="${x.activo ? 0 : 1}">${x.activo ? 'Desactivar' : 'Activar'}</button>`}</td></tr>`).join('')}</tbody></table></div>`;
    c.querySelectorAll('[data-u]').forEach((b) => b.addEventListener('click', async () => {
      try { await api(`/admin/usuarios/${b.dataset.u}/activo`, { method: 'PATCH', body: { activo: b.dataset.a === '1' } }); this.usuarios(); } catch (err) { toast(err.message, true); }
    }));
  },
};

function barra(etiqueta, valor, max) {
  return `<div class="barra"><span>${esc(etiqueta)}</span><div class="pista"><div class="relleno" style="width:${(valor / max) * 100}%"></div></div><span class="num">${valor}</span></div>`;
}

// Confirmación en dos clics (evita diálogos bloqueantes del navegador)
function confirmarAccion(texto, boton) {
  if (boton.dataset.confirmado) return true;
  boton.dataset.confirmado = '1';
  const original = boton.textContent;
  boton.textContent = '¿Seguro? Clic de nuevo';
  toast(texto);
  setTimeout(() => { delete boton.dataset.confirmado; boton.textContent = original; }, 3000);
  return false;
}
