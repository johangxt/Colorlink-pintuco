// Enrutador y navegación por rol
const RUTAS = {
  '/': { vista: () => Tienda.inicio() },
  '/pinturas': { vista: (q) => Tienda.pinturas(q) },
  '/calculadora': { vista: (q) => Tienda.calculadora(q) },
  '/servicio': { vista: (q) => Tienda.servicio(q) },
  '/mis-solicitudes': { vista: () => Tienda.misSolicitudes(), rol: 'cliente' },
  '/mis-compras': { vista: () => Tienda.misCompras(), rol: 'cliente' },
  '/pintor': { vista: () => Pintor.disponibles(), rol: 'pintor' },
  '/pintor/trabajos': { vista: () => Pintor.trabajos(), rol: 'pintor' },
  '/admin': { vista: () => Admin.indicadores(), rol: 'admin' },
  '/admin/inventario': { vista: () => Admin.inventario(), rol: 'admin' },
  '/admin/solicitudes': { vista: () => Admin.solicitudes(), rol: 'admin' },
  '/admin/usuarios': { vista: () => Admin.usuarios(), rol: 'admin' },
};

const NAV = {
  visitante: [['#/pinturas', 'Pinturas'], ['#/calculadora', 'Calculadora'], ['#/servicio', 'Contratar pintor']],
  cliente: [['#/pinturas', 'Pinturas'], ['#/calculadora', 'Calculadora'], ['#/servicio', 'Contratar pintor'], ['#/mis-solicitudes', 'Mis solicitudes'], ['#/mis-compras', 'Mis compras']],
  pintor: [['#/pintor', 'Mi panel'], ['#/pinturas', 'Tienda'], ['#/calculadora', 'Calculadora']],
  admin: [['#/admin', 'Panel'], ['#/pinturas', 'Tienda'], ['#/calculadora', 'Calculadora']],
};
const INICIO_ROL = { cliente: '#/', pintor: '#/pintor', admin: '#/admin' };

const App = {
  iniciar() {
    $('#btn-cuenta').addEventListener('click', () => Cuenta.abrir());
    $('#btn-carrito').addEventListener('click', () => Carrito.abrir());
    $('#btn-menu').addEventListener('click', () => this.menuMovil());
    $('#velo').addEventListener('click', () => Capas.cerrar());
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { Capas.cerrar(); $$('.modal-fondo').forEach((m) => m.remove()); } });
    window.addEventListener('hashchange', () => this.navegar());
    Chat.init();
    Carrito.contador();
    this.navegar();
  },

  pintarNav(ruta) {
    const enlaces = NAV[Sesion.rol] || NAV.visitante;
    const activo = (h) => h === '#' + ruta || (h.length > 3 && ['#/pintor', '#/admin'].includes(h) && ('#' + ruta).startsWith(h));
    $('#nav').innerHTML = enlaces.map(([h, t]) => `<a href="${h}" class="${activo(h) ? 'activo' : ''}">${t}</a>`).join('');
    const u = Sesion.usuario;
    $('#btn-cuenta').title = u ? `${u.nombre} (${u.rol})` : 'Ingresar';
    $('#btn-cuenta').style.background = u ? 'var(--hueso)' : '';
    $('#btn-carrito').classList.toggle('oculto', ['pintor', 'admin'].includes(Sesion.rol));
  },

  menuMovil() {
    const enlaces = NAV[Sesion.rol] || NAV.visitante;
    const c = $('#cajon-menu');
    c.innerHTML = `
      <div class="cajon-cab"><a href="#/" class="logo"><span class="logo-gota"></span>colorlink</a><button class="icono-btn" data-cerrar aria-label="Cerrar">✕</button></div>
      <div class="cajon-cuerpo menu-movil">${enlaces.map(([h, t]) => `<a href="${h}">${t}</a>`).join('')}
        <a href="#" data-abrir-chat>Asesor de color IA</a></div>
      <div class="cajon-pie"><button class="btn negro ancho" id="menu-cuenta">${Sesion.usuario ? 'Mi cuenta' : 'Ingresar'}</button></div>`;
    $$('a, [data-cerrar]', c).forEach((a) => a.addEventListener('click', () => Capas.cerrar()));
    $('#menu-cuenta', c).addEventListener('click', () => { Capas.cerrar(); Cuenta.abrir(); });
    Capas.abrir('#cajon-menu');
  },

  async navegar() {
    const [ruta, query = ''] = (location.hash.slice(1) || '/').split('?');
    const def = RUTAS[ruta] || RUTAS['/'];
    Capas.cerrar();
    this.pintarNav(ruta);
    if (def.rol && Sesion.rol !== def.rol) {
      if (!Sesion.usuario) { location.hash = '#/'; Cuenta.abrir('Ingresa para ver esta sección.'); }
      else location.hash = INICIO_ROL[Sesion.rol] || '#/';
      return;
    }
    $('#chat-flotante').classList.toggle('oculto', !$('#chat').classList.contains('oculto'));
    vista().innerHTML = '<div class="contenedor"><div class="pagina-cab"><p>Cargando…</p></div></div>';
    window.scrollTo(0, 0);
    try { await def.vista(new URLSearchParams(query)); }
    catch (err) { vista().innerHTML = `<div class="contenedor" style="padding:64px 0"><div class="vacio"><h3>No se pudo cargar</h3><p>${esc(err.message)}</p></div></div>`; }
  },

  alIniciarSesion() {
    Chat.reiniciar();
    Carrito.contador();
    const destino = INICIO_ROL[Sesion.rol];
    if (['pintor', 'admin'].includes(Sesion.rol) && location.hash !== destino) location.hash = destino;
    else this.navegar();
  },
};

App.iniciar();
