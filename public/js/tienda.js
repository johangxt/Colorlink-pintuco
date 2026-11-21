// Vistas de la tienda: inicio, catálogo, calculadora, servicio de pintor y cuenta del cliente
const vista = () => document.getElementById('vista');
const Catalogo = {
  cache: null,
  async todas(forzar = false) {
    if (!this.cache || forzar) this.cache = await api('/pinturas');
    return this.cache;
  },
};

const Tienda = {
  // ===================== INICIO =====================
  async inicio() {
    const pinturas = await Catalogo.todas(true);
    const prioridad = (p) => (p.tipo === 'vinilo' ? 0 : p.tipo === 'impermeabilizante' ? 1 : 2);
    const conStock = pinturas.filter((p) => p.stock_galones > 0).sort((a, b) => prioridad(a) - prioridad(b));
    // Mosaico: la escena más colorida en grande y el resto como muestras ordenadas por tono
    const vinilos = pinturas.filter((p) => p.tipo === 'vinilo');
    const estrella = [...vinilos].sort((a, b) => hsl(b.color_hex).s - hsl(a.color_hex).s)[0] || pinturas[0];
    const muestras = pinturas.filter((p) => p.id !== estrella.id && hsl(p.color_hex).l < 0.97).sort((a, b) => hsl(a.color_hex).h - hsl(b.color_hex).h).slice(0, 5);
    const familias = FAMILIAS.map((f) => ({ ...f, items: pinturas.filter((p) => familiaDe(p.color_hex) === f.id) })).filter((f) => f.items.length);
    const destacada = pinturas.find((p) => p.uso === 'exterior' && p.tipo === 'vinilo') || pinturas[0];

    vista().innerHTML = `
      <section class="heroe">
        <div class="heroe-texto">
          <span class="sobretitulo">Tienda Pintuco · en línea</span>
          <h1>Pinta sin adivinar.</h1>
          <p>Elige tu color, calcula exactamente cuántos galones necesitas y, si quieres, un pintor calificado lo aplica por ti.</p>
          <div class="botones">
            <a class="btn negro" href="#/pinturas">Ver colores</a>
            <a class="btn" href="#/calculadora">Calcular galones</a>
          </div>
        </div>
        <div class="heroe-mosaico">
          <a class="tesela grande" href="#/pinturas?familia=${familiaDe(estrella.color_hex)}" style="padding:0">${escena(estrella, { variante: 0 }).replace('class="escena"', 'class="escena" style="position:absolute;inset:0;border-radius:0;aspect-ratio:auto;--c:' + esc(estrella.color_hex) + '"')}<span style="position:relative;z-index:6;margin:16px">${esc(estrella.color)}</span></a>
          ${muestras.map((p) => `<a class="tesela" href="#/pinturas?familia=${familiaDe(p.color_hex)}" style="background:${esc(p.color_hex)}"><span>${esc(p.color)}</span></a>`).join('')}
        </div>
      </section>

      <section class="seccion">
        <div class="contenedor">
          <div class="seccion-cab"><div><span class="sobretitulo">Compra por color</span><h2>¿Qué tono te inspira?</h2></div><a class="btn" href="#/pinturas">Todos los colores</a></div>
          <div class="familias">${familias.map((f) => {
            const tonos = [...f.items.map((p) => p.color_hex), ...f.base].slice(0, 4);
            return `<a class="familia" href="#/pinturas?familia=${f.id}"><div class="disco">${tonos.map((t) => `<span style="background:${esc(t)}"></span>`).join('')}</div><strong>${f.nombre}</strong><small>${f.items.length} ${f.items.length === 1 ? 'color' : 'colores'}</small></a>`;
          }).join('')}</div>
        </div>
      </section>

      <section class="seccion hueso">
        <div class="contenedor">
          <div class="seccion-cab"><div><span class="sobretitulo">Los más elegidos</span><h2>Colores populares</h2><p>Precio por galón. Toca un color para ver su rendimiento y disponibilidad.</p></div></div>
          <div class="rejilla" id="populares">${conStock.slice(0, 8).map(tarjetaProducto).join('')}</div>
        </div>
      </section>

      <section class="seccion">
        <div class="contenedor">
          <div class="banda color" style="--c:${esc(destacada.color_hex)};color:${textoSobre(destacada.color_hex)}">
            <div class="banda-texto">
              <span class="sobretitulo" style="color:inherit;opacity:.8">Calculadora de pintura</span>
              <h2>Ni un galón de más. Ni uno de menos.</h2>
              <p style="color:inherit;opacity:.9">Dinos los metros cuadrados y las manos; nosotros hacemos la cuenta con el rendimiento real de cada pintura.</p>
              <div><a class="btn ${textoSobre(destacada.color_hex) === '#ffffff' ? 'blanco' : 'negro'}" href="#/calculadora?p=${destacada.id}">Calcular ahora</a></div>
            </div>
            <div class="banda-visual">${escena(destacada)}</div>
          </div>
        </div>
      </section>

      <section class="seccion">
        <div class="contenedor">
          <div class="seccion-cab"><div><span class="sobretitulo">Compra por espacio</span><h2>¿Qué vas a pintar?</h2></div></div>
          <div class="espacios">${ESPACIOS.map((e) => `
            <a class="espacio" href="#/pinturas?espacio=${e.id}">${escena({ color_hex: e.escena.hex, tipo: e.escena.tipo, uso: e.escena.tipo === 'fachada' ? 'exterior' : 'interior', id: e.escena.variante ?? 0 })}<strong>${e.nombre} <span>→</span></strong></a>`).join('')}
          </div>
        </div>
      </section>

      <section class="seccion hueso">
        <div class="contenedor">
          <div class="seccion-cab"><div><span class="sobretitulo">Servicio de pintores</span><h2>Nosotros también pintamos.</h2><p>Publica tu solicitud y un pintor de la red la acepta. Al terminar, calificas su trabajo.</p></div><a class="btn negro" href="#/servicio">Contratar un pintor</a></div>
          <div class="pasos">
            <div class="paso"><span class="num">01</span><h3>Cuéntanos tu espacio</h3><p>Elige el color, los m² y las manos. Calculamos y reservamos la pintura.</p></div>
            <div class="paso"><span class="num">02</span><h3>Un pintor la acepta</h3><p>Pintores verificados toman tu solicitud y te contactan para agendar.</p></div>
            <div class="paso"><span class="num">03</span><h3>Califica el resultado</h3><p>Tu opinión de 1 a 5 estrellas ayuda a otros clientes a elegir.</p></div>
          </div>
        </div>
      </section>

      <section class="seccion">
        <div class="contenedor">
          <div class="banda oscura">
            <div class="banda-texto">
              <span class="sobretitulo" style="color:#bdb7af">Asesoría con inteligencia artificial</span>
              <h2>¿No sabes qué color elegir?</h2>
              <p>PintuBot conoce todo nuestro catálogo, precios e inventario. Pregúntale como le preguntarías a un experto.</p>
              <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn blanco" data-abrir-chat>Hablar con PintuBot</button></div>
            </div>
            <div class="banda-visual" style="display:grid;grid-template-columns:repeat(4,1fr)">${pinturas.slice(0, 8).map((p) => `<div style="background:${esc(p.color_hex)}"></div>`).join('')}</div>
          </div>
        </div>
      </section>`;
    activarTarjetas($('#populares'), pinturas);
  },

  // ===================== CATÁLOGO =====================
  async pinturas(params) {
    const orden = { vinilo: 0, impermeabilizante: 1 };
    const pinturas = [...(await Catalogo.todas(true))].sort((a, b) => (orden[a.tipo] ?? 2) - (orden[b.tipo] ?? 2));
    const estado = { familia: params.get('familia') || '', espacio: params.get('espacio') || '', uso: params.get('uso') || '', q: '' };
    const familias = FAMILIAS.filter((f) => pinturas.some((p) => familiaDe(p.color_hex) === f.id));
    vista().innerHTML = `
      <div class="contenedor">
        <div class="pagina-cab"><span class="sobretitulo">Catálogo</span><h1>Pinturas</h1><p>${pinturas.length} colores para interior, exterior, techos y metal. Precio por galón.</p></div>
        <div class="filtros" id="filtros">
          <button class="pildora" data-f="todo">Todo</button>
          ${familias.map((f) => `<button class="pildora" data-familia="${f.id}"><span class="muestra" style="background:${f.base[0]}"></span>${f.nombre}</button>`).join('')}
          <span style="width:1px;height:28px;background:var(--linea);margin:0 4px"></span>
          ${ESPACIOS.map((e) => `<button class="pildora" data-espacio="${e.id}">${e.nombre}</button>`).join('')}
          <input class="buscar" id="buscar" placeholder="Buscar color o producto" />
        </div>
        <div class="rejilla" id="rejilla" style="padding-bottom:88px"></div>
      </div>`;
    const pintar = () => {
      let lista = pinturas;
      if (estado.familia) lista = lista.filter((p) => familiaDe(p.color_hex) === estado.familia);
      if (estado.espacio) lista = lista.filter(ESPACIOS.find((e) => e.id === estado.espacio)?.filtro || (() => true));
      if (estado.uso) lista = lista.filter((p) => p.uso === estado.uso || p.uso === 'mixto');
      if (estado.q) { const t = estado.q.toLowerCase(); lista = lista.filter((p) => `${p.nombre} ${p.color} ${p.tipo}`.toLowerCase().includes(t)); }
      $$('#filtros [data-familia]').forEach((b) => b.classList.toggle('activo', b.dataset.familia === estado.familia));
      $$('#filtros [data-espacio]').forEach((b) => b.classList.toggle('activo', b.dataset.espacio === estado.espacio));
      $('#filtros [data-f=todo]').classList.toggle('activo', !estado.familia && !estado.espacio && !estado.uso);
      $('#rejilla').innerHTML = lista.length ? lista.map(tarjetaProducto).join('') : '<div class="vacio" style="grid-column:1/-1"><h3>Sin resultados</h3><p>Prueba con otro color o espacio.</p></div>';
      activarTarjetas($('#rejilla'), pinturas);
    };
    $$('#filtros [data-familia]').forEach((b) => b.addEventListener('click', () => { estado.familia = estado.familia === b.dataset.familia ? '' : b.dataset.familia; pintar(); }));
    $$('#filtros [data-espacio]').forEach((b) => b.addEventListener('click', () => { estado.espacio = estado.espacio === b.dataset.espacio ? '' : b.dataset.espacio; pintar(); }));
    $('#filtros [data-f=todo]').addEventListener('click', () => { Object.assign(estado, { familia: '', espacio: '', uso: '' }); pintar(); });
    let t;
    $('#buscar').addEventListener('input', (e) => { clearTimeout(t); t = setTimeout(() => { estado.q = e.target.value; pintar(); }, 200); });
    pintar();
  },

  // ===================== CALCULADORA =====================
  async calculadora(params, { modoServicio = false } = {}) {
    const pinturas = (await Catalogo.todas(true)).filter((p) => p.stock_galones > 0).sort((a, b) => (a.tipo === 'vinilo' ? 0 : 1) - (b.tipo === 'vinilo' ? 0 : 1));
    let sel = pinturas.find((p) => p.id === Number(params.get('p'))) || pinturas[0];
    let manos = Number(params.get('manos')) || 2;
    let ultimo = null;
    const m2Inicial = params.get('m2') || '40';

    vista().innerHTML = `
      <div class="contenedor">
        <div class="pagina-cab">
          <span class="sobretitulo">${modoServicio ? 'Servicio de pintores' : 'Calculadora'}</span>
          <h1>${modoServicio ? 'Contrata un pintor' : '¿Cuánta pintura necesito?'}</h1>
          <p>${modoServicio ? 'Elige el color y el área. Calculamos los galones, los reservamos del inventario y un pintor de la red acepta tu solicitud.' : 'Elige el color, indica los metros cuadrados y las manos. Usamos el rendimiento real de cada pintura y un 10 % de margen.'}</p>
        </div>
        <div class="calc" style="margin-bottom:88px">
          <form class="calc-form" id="form-calc">
            <div class="campo"><span>Color <span class="nombre-color" id="nombre-color"></span></span>
              <div class="selector-color">${pinturas.map((p) => `<button type="button" data-p="${p.id}" style="background:${esc(p.color_hex)}" title="${esc(p.nombre)}" aria-label="${esc(p.nombre)}"></button>`).join('')}</div>
            </div>
            <div class="fila-campos">
              <label class="campo">Área a pintar (m²)<input type="number" name="metros_cuadrados" min="1" step="0.1" value="${esc(m2Inicial)}" required /></label>
              <div class="campo">Número de manos<div class="segmentos" id="manos">${[1, 2, 3].map((n) => `<button type="button" data-m="${n}">${n}</button>`).join('')}</div></div>
            </div>
            <span class="ayuda" style="font-size:13px;color:var(--suave)">¿No sabes el área? Multiplica el largo de cada pared por su altura y suma los resultados.</span>
            ${modoServicio ? `
              <label class="campo">Dirección del inmueble<input name="direccion" required minlength="5" placeholder="Calle, número, apto, ciudad" /></label>
              <div class="fila-campos">
                <label class="campo">Fecha deseada<input type="date" name="fecha_deseada" /></label>
                <label class="campo">Descripción<input name="descripcion" placeholder="Ej: sala y comedor" /></label>
              </div>
              <button class="btn negro ancho">${Sesion.rol === 'cliente' ? 'Enviar solicitud' : 'Inicia sesión para enviar'}</button>`
            : `<div style="display:flex;gap:10px;flex-wrap:wrap">
                <button type="button" class="btn negro" id="calc-carrito">Agregar al carrito</button>
                <button type="button" class="btn" id="calc-servicio">Que lo pinte un profesional</button>
              </div>`}
          </form>
          <div class="calc-res" id="calc-res">
            <div id="calc-escena" style="position:absolute;inset:0"></div>
            <div class="tarjeta-res" id="tarjeta-res"></div>
          </div>
        </div>
      </div>`;

    const form = $('#form-calc');
    const pintarSel = () => {
      $$('.selector-color button').forEach((b) => b.classList.toggle('activo', Number(b.dataset.p) === sel.id));
      $$('#manos button').forEach((b) => b.classList.toggle('activo', Number(b.dataset.m) === manos));
      $('#nombre-color').textContent = `· ${sel.color} (${sel.tipo})`;
      $('#calc-res').style.setProperty('--c', sel.color_hex);
      $('#calc-escena').innerHTML = escena(sel, { variante: 0 });
      $('#calc-escena .escena').style.cssText += ';position:absolute;inset:0;border-radius:0;aspect-ratio:auto';
    };
    const recalcular = async () => {
      pintarSel();
      const m2 = Number(form.metros_cuadrados.value);
      if (!(m2 > 0)) { $('#tarjeta-res').innerHTML = '<p>Ingresa los metros cuadrados.</p>'; return; }
      try {
        ultimo = await api('/pinturas/calcular', { method: 'POST', body: { pintura_id: sel.id, metros_cuadrados: m2, manos } });
        $('#tarjeta-res').innerHTML = `
          <span class="sobretitulo" style="margin:0">Necesitas</span>
          <div class="grande">${ultimo.galones} <small>${ultimo.galones === 1 ? 'galón' : 'galones'}</small></div>
          <dl>
            <dt>Color</dt><dd>${esc(sel.nombre)}</dd>
            <dt>Área × manos</dt><dd>${ultimo.metros_cuadrados} m² × ${ultimo.manos}</dd>
            <dt>Rendimiento</dt><dd>${ultimo.rendimiento_m2_gal} m² por galón</dd>
            <dt>Cálculo exacto</dt><dd>${ultimo.galones_exactos} gal (+${ultimo.desperdicio_pct} %)</dd>
            <dt>Equivale a</dt><dd>${ultimo.litros} litros</dd>
            <dt>Disponibilidad</dt><dd>${ultimo.stock_suficiente ? 'En inventario ✓' : `Solo ${ultimo.pintura.stock_galones} gal`}</dd>
          </dl>
          <div class="total" style="border-top:1px solid var(--linea);padding-top:14px"><span>Costo de pintura</span><span>${pesos(ultimo.costo_estimado)}</span></div>`;
      } catch (err) { $('#tarjeta-res').innerHTML = `<p>${esc(err.message)}</p>`; ultimo = null; }
    };
    $$('.selector-color button').forEach((b) => b.addEventListener('click', () => { sel = pinturas.find((p) => p.id === Number(b.dataset.p)); recalcular(); }));
    $$('#manos button').forEach((b) => b.addEventListener('click', () => { manos = Number(b.dataset.m); recalcular(); }));
    let t;
    form.metros_cuadrados.addEventListener('input', () => { clearTimeout(t); t = setTimeout(recalcular, 250); });

    if (modoServicio) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (Sesion.rol !== 'cliente') { Cuenta.abrir('Inicia sesión como cliente para enviar tu solicitud.'); return; }
        const d = datosForm(form);
        try {
          const s = await api('/solicitudes', { method: 'POST', body: { pintura_id: sel.id, metros_cuadrados: Number(d.metros_cuadrados), manos, direccion: d.direccion, fecha_deseada: d.fecha_deseada || null, descripcion: d.descripcion } });
          toast(`Solicitud #${s.id} enviada: ${s.galones} galones reservados`);
          location.hash = '#/mis-solicitudes';
        } catch (err) { toast(err.message, true); }
      });
    } else {
      $('#calc-carrito').addEventListener('click', () => {
        if (!ultimo) return;
        Carrito.agregar(sel, Math.min(ultimo.galones, sel.stock_galones));
        Carrito.abrir();
      });
      $('#calc-servicio').addEventListener('click', () => {
        location.hash = `#/servicio?p=${sel.id}&m2=${form.metros_cuadrados.value}&manos=${manos}`;
      });
    }
    recalcular();
  },

  servicio(params) { return Tienda.calculadora(params, { modoServicio: true }); },

  // ===================== CUENTA DEL CLIENTE =====================
  async misSolicitudes() {
    const lista = await api('/solicitudes/mis');
    vista().innerHTML = `
      <div class="contenedor">
        <div class="pagina-cab"><span class="sobretitulo">Mi cuenta</span><h1>Mis solicitudes</h1><p>Sigue el avance de tus servicios de pintura y califica a tu pintor al terminar.</p></div>
        <div class="lista">${lista.length ? lista.map((s) => {
          const paso = ORDEN_ESTADO.indexOf(s.estado);
          return `
          <article class="fila-item">
            ${escena({ color_hex: s.pintura?.color_hex, id: s.pintura_id })}
            <div>
              <h3>${esc(s.pintura?.nombre)} ${chipEstado(s.estado)}</h3>
              <div class="meta">${s.metros_cuadrados} m² · ${s.manos} ${s.manos === 1 ? 'mano' : 'manos'} · <b>${s.galones} galones</b> · ${pesos(s.costo_pintura)} · ${fecha(s.created_at)}</div>
              <div class="meta">${esc(s.direccion)} · Pintor: ${s.pintor ? `<b>${esc(s.pintor.nombre)}</b> (${esc(s.pintor.telefono || 'sin teléfono')})` : 'buscando pintor…'}</div>
              ${s.estado !== 'cancelada' ? `<div class="progreso">${ORDEN_ESTADO.map((_, i) => `<i class="${i <= paso ? 'on' : ''}"></i>`).join('')}</div>` : ''}
              ${s.calificacion ? `<div class="meta" style="margin-top:10px"><span class="estrellas">${estrellas(s.calificacion.puntuacion)}</span> ${esc(s.calificacion.comentario || '')}</div>` : ''}
            </div>
            <div class="acciones">
              ${s.estado === 'pendiente' ? `<button class="btn chico peligro" data-cancelar="${s.id}">Cancelar</button>` : ''}
              ${s.estado === 'completada' && !s.calificacion ? `<button class="btn chico negro" data-calificar="${s.id}">Calificar pintor</button>` : ''}
            </div>
          </article>`;
        }).join('') : '<div class="vacio"><h3>Aún no tienes solicitudes</h3><p>Pide un pintor y sigue aquí el avance del trabajo.</p><a class="btn negro" href="#/servicio">Contratar un pintor</a></div>'}</div>
      </div>`;
    $$('[data-cancelar]').forEach((b) => b.addEventListener('click', async () => {
      if (!confirmarAccion(b, '¿Seguro?')) return;
      try { await api(`/solicitudes/${b.dataset.cancelar}/cancelar`, { method: 'PATCH' }); toast('Solicitud cancelada; la pintura volvió al inventario'); this.misSolicitudes(); } catch (err) { toast(err.message, true); }
    }));
    $$('[data-calificar]').forEach((b) => b.addEventListener('click', () => this.calificar(Number(b.dataset.calificar))));
  },

  calificar(id) {
    let puntos = 5;
    const m = modal(`
      <h2>¿Cómo quedó?</h2>
      <p class="sub">Califica la atención y el trabajo del pintor.</p>
      <form class="form" id="form-cal">
        <div class="selector-estrellas">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-n="${n}" class="on" aria-label="${n} estrellas">★</button>`).join('')}</div>
        <label class="campo">Comentario (opcional)<textarea name="comentario" rows="3" placeholder="Puntualidad, limpieza, acabado…"></textarea></label>
        <button class="btn negro ancho">Enviar calificación</button>
      </form>`);
    const pintar = () => $$('[data-n]', m.el).forEach((b) => b.classList.toggle('on', Number(b.dataset.n) <= puntos));
    $$('[data-n]', m.el).forEach((b) => b.addEventListener('click', () => { puntos = Number(b.dataset.n); pintar(); }));
    $('#form-cal', m.el).addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await api(`/solicitudes/${id}/calificar`, { method: 'POST', body: { puntuacion: puntos, comentario: datosForm(e.target).comentario } });
        m.cerrar(); toast('¡Gracias por tu calificación!'); this.misSolicitudes();
      } catch (err) { toast(err.message, true); }
    });
  },

  async misCompras() {
    const [pedidos, pinturas] = await Promise.all([api('/pedidos/mis'), Catalogo.todas()]);
    const hex = Object.fromEntries(pinturas.map((p) => [p.id, p]));
    vista().innerHTML = `
      <div class="contenedor">
        <div class="pagina-cab"><span class="sobretitulo">Mi cuenta</span><h1>Mis compras</h1></div>
        <div class="lista">${pedidos.length ? pedidos.map((p) => `
          <article class="fila-item" style="grid-template-columns:1fr auto">
            <div>
              <h3>Pedido #${p.id} ${chipEstado(p.estado)}</h3>
              <div class="meta">${fecha(p.created_at)} · Envío a ${esc(p.direccion_envio)}</div>
              <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px">${p.items.map((i) => `
                <span class="pildora" style="cursor:default"><span class="muestra" style="background:${esc(hex[i.pintura_id]?.color_hex || '#ddd')}"></span>${i.cantidad} gal · ${esc(i.nombre)}</span>`).join('')}</div>
            </div>
            <div class="precio" style="font-family:var(--titulo);font-size:24px;font-weight:900">${pesos(p.total)}</div>
          </article>`).join('') : '<div class="vacio"><h3>Aún no has comprado</h3><p>Tus pedidos aparecerán aquí.</p><a class="btn negro" href="#/pinturas">Ver pinturas</a></div>'}</div>
      </div>`;
  },
};
