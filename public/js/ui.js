// Componentes visuales compartidos: escenas de color, familias, carrito, cuenta
// ---------------------------------------------------------------------------

// ---- Color: familia a partir del código hexadecimal ----
function hsl(hex) {
  const n = parseInt(String(hex).replace('#', ''), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return { h, s, l };
}
const FAMILIAS = [
  { id: 'blancos', nombre: 'Blancos', base: ['#ffffff', '#f6f1e7', '#efe8da', '#f9f6ef'] },
  { id: 'neutros', nombre: 'Neutros', base: ['#c9ccce', '#b8afa2', '#d8d2c6', '#9a9a96'] },
  { id: 'calidos', nombre: 'Cálidos y tierras', base: ['#c4623a', '#9e2b25', '#e0a458', '#b5543c'] },
  { id: 'verdes', nombre: 'Verdes', base: ['#6f8f6a', '#a9bf9c', '#3f5f4a', '#cbd8bf'] },
  { id: 'azules', nombre: 'Azules', base: ['#8ec5e8', '#4f7fa8', '#2c4a63', '#bcd8ea'] },
  { id: 'oscuros', nombre: 'Oscuros', base: ['#1e1e1e', '#2f3b45', '#3d3530', '#4a4a48'] },
];
function familiaDe(hex) {
  const { h, s, l } = hsl(hex);
  if (l >= 0.88) return 'blancos';
  if (l < 0.2) return 'oscuros';
  if (s < 0.12) return l < 0.3 ? 'oscuros' : 'neutros';
  if (h < 70 || h >= 330) return 'calidos';
  if (h < 170) return 'verdes';
  if (h < 270) return 'azules';
  return 'calidos';
}
const textoSobre = (hex) => (hsl(hex).l > 0.6 ? '#141414' : '#ffffff');

// ---- Espacios: cómo se agrupan los productos por lugar de uso ----
const ESPACIOS = [
  { id: 'interiores', nombre: 'Salas y habitaciones', filtro: (p) => p.tipo === 'vinilo' && p.uso !== 'exterior', escena: { hex: '#E9D9C4', variante: 0 } },
  { id: 'fachadas', nombre: 'Fachadas', filtro: (p) => p.uso === 'exterior' && p.tipo !== 'impermeabilizante', escena: { hex: '#C4623A', tipo: 'fachada' } },
  { id: 'techos', nombre: 'Techos y terrazas', filtro: (p) => p.tipo === 'impermeabilizante', escena: { hex: '#9E2B25', tipo: 'impermeabilizante' } },
  { id: 'metal', nombre: 'Rejas, puertas y madera', filtro: (p) => ['esmalte', 'anticorrosivo', 'laca'].includes(p.tipo), escena: { hex: '#1E1E1E', tipo: 'esmalte' } },
];

// ---- Escena: ilustración de un espacio pintado con el color ----
function escena(p, { variante, etiqueta = '' } = {}) {
  const hex = p.color_hex || p.hex || '#dddddd';
  const tipo = p.tipo || 'vinilo';
  const v = variante ?? ((p.id || 0) % 3);
  let capas;
  if (tipo === 'impermeabilizante') {
    return `<div class="escena" style="--c:#efe6d8;--c2:${esc(hex)}"><div class="techo"></div><div class="ventana" style="top:42%;left:18%;height:32%"></div><div class="zocalo"></div><div class="piso"></div><div class="planta"></div>${etiqueta}</div>`;
  }
  if (['esmalte', 'anticorrosivo', 'laca'].includes(tipo)) {
    return `<div class="escena metal" style="--c:${esc(hex)}"><div class="reja"></div><div class="zocalo"></div><div class="piso"></div>${etiqueta}</div>`;
  }
  if (p.uso === 'exterior' || tipo === 'fachada') {
    capas = '<div class="ventana"></div><div class="ventana" style="left:58%"></div><div class="planta" style="right:auto;left:44%"></div>';
  } else if (v === 1) {
    capas = '<div class="lampara"></div><div class="aparador"></div><div class="jarron"></div><div class="planta"></div>';
  } else if (v === 2) {
    capas = '<div class="ventana"></div><div class="silla"></div><div class="lampara" style="left:30%"></div>';
  } else {
    capas = '<div class="cuadro"></div><div class="sofa"></div><div class="planta"></div>';
  }
  return `<div class="escena" style="--c:${esc(hex)}">${capas}<div class="zocalo"></div><div class="piso"></div>${etiqueta}</div>`;
}

// Etiquetas comerciales de un producto
function etiquetasDe(p) {
  if (p.stock_galones <= 0) return '<span class="etq"><span class="etiqueta">Agotado</span></span>';
  if (p.stock_galones <= p.stock_minimo) return '<span class="etq"><span class="etiqueta acento">Últimas unidades</span></span>';
  const dias = (Date.now() - new Date(p.created_at).getTime()) / 864e5;
  if (dias < 14 && p.id > 8) return '<span class="etq"><span class="etiqueta negra">Nuevo color</span></span>';
  if (p.uso === 'exterior') return '<span class="etq"><span class="etiqueta">Exterior</span></span>';
  return '';
}

// ---- Tarjeta de producto ----
function tarjetaProducto(p) {
  const agotado = p.stock_galones <= 0;
  return `
    <article class="producto" data-producto="${p.id}">
      <div data-ver="${p.id}" role="button" tabindex="0" aria-label="Ver ${esc(p.nombre)}">${escena(p, { etiqueta: etiquetasDe(p) })}</div>
      <div class="info">
        <div><h3>${esc(p.color)}</h3><div class="meta">${esc(p.tipo)} · ${esc(p.acabado)} · ${esc(p.uso)}</div></div>
        <div class="precio">${pesos(p.precio_galon)}<small>por galón</small></div>
      </div>
      <div class="comprar">
        <div class="cantidad"><button data-menos aria-label="Menos">−</button><span data-cant>1</span><button data-mas aria-label="Más">+</button></div>
        <button class="btn negro" data-agregar="${p.id}" ${agotado ? 'disabled' : ''}>${agotado ? 'Agotado' : 'Agregar'}</button>
      </div>
    </article>`;
}

function activarTarjetas(root, pinturas) {
  $$('.producto', root).forEach((card) => {
    const p = pinturas.find((x) => x.id === Number(card.dataset.producto));
    const cant = $('[data-cant]', card);
    $('[data-menos]', card).addEventListener('click', () => { cant.textContent = Math.max(1, Number(cant.textContent) - 1); });
    $('[data-mas]', card).addEventListener('click', () => { cant.textContent = Math.min(p.stock_galones || 1, Number(cant.textContent) + 1); });
    $('[data-agregar]', card).addEventListener('click', () => { Carrito.agregar(p, Number(cant.textContent)); Carrito.abrir(); });
    const ver = $('[data-ver]', card);
    ver.addEventListener('click', () => vistaRapida(p));
    ver.addEventListener('keydown', (e) => { if (e.key === 'Enter') vistaRapida(p); });
  });
}

function vistaRapida(p) {
  const m = modal(`
    <div style="display:grid;gap:22px">
      ${escena(p, { etiqueta: etiquetasDe(p) })}
      <div>
        <span class="sobretitulo">${esc(p.tipo)} · ${esc(p.acabado)} · ${esc(p.uso)}</span>
        <h2>${esc(p.color)}</h2>
        <p class="sub">${esc(p.nombre)}. ${esc(p.descripcion || '')}</p>
        <div style="display:flex;gap:28px;flex-wrap:wrap;margin-bottom:22px;font-size:14px">
          <div><b style="font-size:22px;font-family:var(--titulo)">${pesos(p.precio_galon)}</b><br><span style="color:var(--suave)">por galón</span></div>
          <div><b style="font-size:22px;font-family:var(--titulo)">${p.rendimiento_m2_gal} m²</b><br><span style="color:var(--suave)">por galón, una mano</span></div>
          <div><b style="font-size:22px;font-family:var(--titulo)">${p.stock_galones}</b><br><span style="color:var(--suave)">galones disponibles</span></div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn negro" id="vr-agregar" ${p.stock_galones ? '' : 'disabled'}>Agregar 1 galón</button>
          <a class="btn" href="#/calculadora?p=${p.id}" id="vr-calc">¿Cuántos galones necesito?</a>
        </div>
      </div>
    </div>`, { ancho: false });
  $('#vr-agregar', m.el).addEventListener('click', () => { Carrito.agregar(p, 1); m.cerrar(); Carrito.abrir(); });
  $('#vr-calc', m.el).addEventListener('click', m.cerrar);
}

// ---- Capas (velo + cajones) ----
const Capas = {
  abrir(id) {
    $('#velo').classList.remove('oculto');
    $(id).classList.add('abierto');
    document.body.style.overflow = 'hidden';
  },
  cerrar() {
    $('#velo').classList.add('oculto');
    $$('.cajon').forEach((c) => c.classList.remove('abierto'));
    document.body.style.overflow = '';
  },
};

// ---- Carrito ----
const Carrito = {
  items() { try { return JSON.parse(localStorage.getItem('pintuco_carrito')) || []; } catch { return []; } },
  guardar(items) { localStorage.setItem('pintuco_carrito', JSON.stringify(items)); this.contador(); },
  agregar(p, cantidad = 1) {
    const items = this.items();
    const ex = items.find((i) => i.pintura_id === p.id);
    if (ex) ex.cantidad = Math.min(ex.cantidad + cantidad, p.stock_galones);
    else items.push({ pintura_id: p.id, nombre: p.nombre, color: p.color, tipo: p.tipo, uso: p.uso, precio: Number(p.precio_galon), color_hex: p.color_hex, cantidad, stock: p.stock_galones });
    this.guardar(items);
  },
  total() { return this.items().reduce((s, i) => s + i.precio * i.cantidad, 0); },
  unidades() { return this.items().reduce((s, i) => s + i.cantidad, 0); },
  contador() {
    const n = this.unidades();
    const b = $('#carrito-n');
    b.textContent = n;
    b.classList.toggle('oculto', !n);
  },
  abrir() { this.pintar(); Capas.abrir('#cajon-carrito'); },
  pintar() {
    const items = this.items();
    const c = $('#cajon-carrito');
    c.innerHTML = `
      <div class="cajon-cab"><h2>Tu carrito</h2><button class="icono-btn" data-cerrar aria-label="Cerrar">✕</button></div>
      <div class="cajon-cuerpo">${items.length ? items.map((i, idx) => `
        <div class="linea-carrito">
          ${escena({ color_hex: i.color_hex, tipo: i.tipo, uso: i.uso, id: i.pintura_id })}
          <div><strong>${esc(i.color)}</strong><small>${esc(i.nombre)}</small><br><small>${pesos(i.precio)} / galón</small>
            <div class="cantidad" style="margin-top:8px"><button data-menos="${idx}">−</button><span>${i.cantidad}</span><button data-mas="${idx}">+</button></div></div>
          <div style="text-align:right"><b>${pesos(i.precio * i.cantidad)}</b><br><button class="link" style="font-size:12px;margin-top:8px" data-quitar="${idx}">Quitar</button></div>
        </div>`).join('') : `<div class="vacio"><h3>Está vacío</h3><p>Descubre los colores y agrega tus galones.</p><a class="btn negro" href="#/pinturas" data-cerrar>Ver pinturas</a></div>`}
      </div>
      ${items.length ? `
      <form class="cajon-pie" id="form-compra">
        <div class="total"><span>Total</span><span>${pesos(this.total())}</span></div>
        <label class="campo">Dirección de envío<input name="direccion_envio" required minlength="5" placeholder="Calle, número, ciudad" /></label>
        <button class="btn negro ancho">${Sesion.rol === 'cliente' ? 'Finalizar compra' : 'Inicia sesión para comprar'}</button>
        <small style="color:var(--suave);text-align:center">Pago simulado con fines académicos.</small>
      </form>` : ''}`;
    $$('[data-cerrar]', c).forEach((b) => b.addEventListener('click', () => Capas.cerrar()));
    const mod = (idx, fn) => { const its = this.items(); fn(its, Number(idx)); this.guardar(its.filter((x) => x.cantidad > 0)); this.pintar(); };
    $$('[data-menos]', c).forEach((b) => b.addEventListener('click', () => mod(b.dataset.menos, (its, i) => { its[i].cantidad -= 1; })));
    $$('[data-mas]', c).forEach((b) => b.addEventListener('click', () => mod(b.dataset.mas, (its, i) => { its[i].cantidad = Math.min(its[i].cantidad + 1, its[i].stock || 999); })));
    $$('[data-quitar]', c).forEach((b) => b.addEventListener('click', () => mod(b.dataset.quitar, (its, i) => { its[i].cantidad = 0; })));
    const form = $('#form-compra', c);
    if (form) form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (Sesion.rol !== 'cliente') { Capas.cerrar(); Cuenta.abrir('Inicia sesión como cliente para finalizar tu compra.'); return; }
      try {
        const pedido = await api('/pedidos', { method: 'POST', body: { ...datosForm(form), items: this.items().map(({ pintura_id, cantidad }) => ({ pintura_id, cantidad })) } });
        this.guardar([]);
        Capas.cerrar();
        toast(`¡Listo! Pedido #${pedido.id} por ${pesos(pedido.total)}`);
        location.hash = '#/mis-compras';
      } catch (err) { toast(err.message, true); }
    });
  },
};

// ---- Cuenta: ingreso, registro y menú de usuario ----
const Cuenta = {
  abrir(mensaje = '') {
    if (Sesion.usuario) return this.menu();
    const m = modal(`
      <h2>Bienvenido</h2>
      <p class="sub">${esc(mensaje || 'Ingresa para comprar, pedir un pintor o gestionar tus trabajos.')}</p>
      <div class="segmentos" style="margin-bottom:22px"><button class="activo" data-tab="login">Ingresar</button><button data-tab="registro">Crear cuenta</button></div>
      <form class="form" id="f-login">
        <label class="campo">Correo<input type="email" name="email" required autocomplete="email" /></label>
        <label class="campo">Contraseña<input type="password" name="password" required autocomplete="current-password" /></label>
        <button class="btn negro ancho">Ingresar</button>
        <p style="text-align:center;font-size:14px;color:var(--suave);margin:0">¿No tienes cuenta? <button type="button" class="link" data-ir-registro>Créala gratis</button></p>
      </form>
      <form class="form oculto" id="f-registro">
        <label class="campo">Nombre completo<input name="nombre" required minlength="3" /></label>
        <label class="campo">Correo<input type="email" name="email" required /></label>
        <div class="fila-campos">
          <label class="campo">Teléfono<input name="telefono" /></label>
          <label class="campo">Contraseña<input type="password" name="password" required minlength="8" placeholder="Mínimo 8" /></label>
        </div>
        <input type="hidden" name="rol" value="cliente" />
        <div class="campo">Quiero
          <div class="segmentos" id="rol-reg"><button type="button" class="activo" data-rol="cliente">Comprar y contratar</button><button type="button" data-rol="pintor">Trabajar como pintor</button></div>
        </div>
        <button class="btn negro ancho">Crear cuenta</button>
      </form>`);
    $$('[data-tab]', m.el).forEach((b) => b.addEventListener('click', () => {
      $$('[data-tab]', m.el).forEach((x) => x.classList.toggle('activo', x === b));
      $('#f-login', m.el).classList.toggle('oculto', b.dataset.tab !== 'login');
      $('#f-registro', m.el).classList.toggle('oculto', b.dataset.tab !== 'registro');
    }));
    $('[data-ir-registro]', m.el).addEventListener('click', () => $('[data-tab=registro]', m.el).click());
    $$('#rol-reg button', m.el).forEach((b) => b.addEventListener('click', () => {
      $('[data-ir-registro]', m.el).addEventListener('click', () => $('[data-tab=registro]', m.el).click());
    $$('#rol-reg button', m.el).forEach((x) => x.classList.toggle('activo', x === b));
      $('#f-registro [name=rol]', m.el).value = b.dataset.rol;
    }));
    const enviar = (ruta) => async (e) => {
      e.preventDefault();
      try {
        const data = await api(ruta, { method: 'POST', body: datosForm(e.target) });
        if (data.verificacion) { m.cerrar(); return Cuenta.verificar(data.email); }
        Sesion.guardar(data.token, data.usuario);
        m.cerrar();
        toast(`Bienvenido, ${data.usuario.nombre.split(' ')[0]}`);
        App.alIniciarSesion();
      } catch (err) {
        if (err.data?.requiereVerificacion) { m.cerrar(); return Cuenta.verificar(err.data.email); }
        toast(err.message, true);
      }
    };
    $('#f-login', m.el).addEventListener('submit', enviar('/auth/login'));
    $('#f-registro', m.el).addEventListener('submit', enviar('/auth/registro'));
  },
  verificar(email) {
    const m = modal(`
      <h2>Verifica tu correo</h2>
      <p class="sub">Enviamos un código de 6 dígitos a <strong>${esc(email)}</strong>. Vence en 10 minutos.</p>
      <form class="form" id="f-codigo">
        <label class="campo">Código<input name="codigo" required inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="one-time-code" placeholder="123456" /></label>
        <button class="btn negro ancho">Verificar</button>
        <p style="text-align:center;font-size:14px;color:var(--suave);margin:0">¿No llegó? Revisa spam o <button type="button" class="link" id="reenviar">reenvía el código</button></p>
      </form>`);
    $('#f-codigo', m.el).addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const { token, usuario } = await api('/auth/verificar', { method: 'POST', body: { email, codigo: datosForm(e.target).codigo } });
        Sesion.guardar(token, usuario);
        m.cerrar();
        toast(`Bienvenido, ${usuario.nombre.split(' ')[0]}`);
        App.alIniciarSesion();
      } catch (err) { toast(err.message, true); }
    });
    $('#reenviar', m.el).addEventListener('click', async () => {
      try {
        await api('/auth/reenviar', { method: 'POST', body: { email } });
        toast('Te enviamos un código nuevo');
      } catch (err) { toast(err.message, true); }
    });
  },
  menu() {
    const u = Sesion.usuario;
    const enlaces = {
      cliente: [['#/mis-solicitudes', 'Mis solicitudes de servicio'], ['#/mis-compras', 'Mis compras'], ['#/servicio', 'Contratar un pintor']],
      pintor: [['#/pintor', 'Solicitudes disponibles'], ['#/pintor/trabajos', 'Mis trabajos']],
      admin: [['#/admin', 'Panel de indicadores'], ['#/admin/inventario', 'Inventario'], ['#/admin/solicitudes', 'Solicitudes'], ['#/admin/usuarios', 'Usuarios']],
    }[u.rol] || [];
    const m = modal(`
      <span class="chip-rol">${esc(u.rol)}</span>
      <h2 style="margin-top:14px">${esc(u.nombre)}</h2>
      <p class="sub">${esc(u.email)}</p>
      <div class="menu-movil" style="margin-bottom:22px">${enlaces.map(([h, t]) => `<a href="${h}" style="font-size:22px">${t} →</a>`).join('')}</div>
      <button class="btn ancho" id="salir">Cerrar sesión</button>`);
    $$('a', m.el).forEach((a) => a.addEventListener('click', m.cerrar));
    $('#salir', m.el).addEventListener('click', () => { Sesion.cerrar(); location.hash = '#/'; location.reload(); });
  },
};
