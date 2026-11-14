// Controlador principal: sesión, menú por rol y navegación
const MENUS = {
  cliente: [
    ['catalogo', 'Catálogo', () => VistasCliente.catalogo()],
    ['carrito', 'Carrito', () => VistasCliente.carrito()],
    ['solicitar', 'Solicitar servicio', () => VistasCliente.solicitar()],
    ['misSolicitudes', 'Mis solicitudes', () => VistasCliente.misSolicitudes()],
    ['pedidos', 'Mis compras', () => VistasCliente.pedidos()],
  ],
  pintor: [
    ['disponibles', 'Solicitudes disponibles', () => VistasPintor.disponibles()],
    ['trabajos', 'Mis trabajos', () => VistasPintor.trabajos()],
  ],
  admin: [
    ['dashboard', 'Indicadores', () => VistasAdmin.dashboard()],
    ['inventario', 'Inventario', () => VistasAdmin.inventario()],
    ['solicitudesAdmin', 'Solicitudes', () => VistasAdmin.solicitudes()],
    ['usuarios', 'Usuarios', () => VistasAdmin.usuarios()],
  ],
};

const App = {
  actual: null,
  iniciar() {
    document.querySelectorAll('[data-auth]').forEach((b) => b.addEventListener('click', () => {
      document.querySelectorAll('[data-auth]').forEach((x) => x.classList.toggle('activo', x === b));
      document.getElementById('form-login').classList.toggle('oculto', b.dataset.auth !== 'login');
      document.getElementById('form-registro').classList.toggle('oculto', b.dataset.auth !== 'registro');
    }));
    document.getElementById('form-login').addEventListener('submit', (e) => this.autenticar(e, '/auth/login'));
    document.getElementById('form-registro').addEventListener('submit', (e) => this.autenticar(e, '/auth/registro'));
    Chat.init();
    if (Sesion.token && Sesion.usuario) this.entrar(); else this.mostrarAcceso();
  },
  async autenticar(e, ruta) {
    e.preventDefault();
    try {
      const { token, usuario } = await api(ruta, { method: 'POST', body: datosForm(e.target) });
      Sesion.guardar(token, usuario);
      this.entrar();
    } catch (err) { toast(err.message, true); }
  },
  mostrarAcceso() {
    document.getElementById('vista-acceso').classList.remove('oculto');
    document.getElementById('vista-app').classList.add('oculto');
    document.getElementById('chat-toggle').classList.add('oculto');
    document.getElementById('chat').classList.add('oculto');
    document.getElementById('sesion').innerHTML = '';
  },
  entrar() {
    const u = Sesion.usuario;
    document.getElementById('vista-acceso').classList.add('oculto');
    document.getElementById('vista-app').classList.remove('oculto');
    document.getElementById('chat-toggle').classList.remove('oculto');
    document.getElementById('sesion').innerHTML = `<span>${esc(u.nombre)}</span><span class="rol">${esc(u.rol)}</span><button class="link" id="salir">Salir</button>`;
    document.getElementById('salir').addEventListener('click', () => { Sesion.cerrar(); location.reload(); });
    this.ir(MENUS[u.rol][0][0]);
  },
  actualizarMenu() {
    const u = Sesion.usuario;
    if (!u) return;
    document.getElementById('menu').innerHTML = MENUS[u.rol].map(([id, nombre]) => {
      const extra = id === 'carrito' && Carrito.unidades() ? ` (${Carrito.unidades()})` : '';
      return `<button class="tab-btn ${id === this.actual ? 'activo' : ''}" data-ir="${id}">${nombre}${extra}</button>`;
    }).join('');
    document.querySelectorAll('[data-ir]').forEach((b) => b.addEventListener('click', () => this.ir(b.dataset.ir)));
  },
  async ir(id) {
    const item = MENUS[Sesion.usuario.rol].find(([k]) => k === id);
    if (!item) return;
    this.actual = id;
    this.actualizarMenu();
    document.getElementById('contenido').innerHTML = '<p class="vacio">Cargando…</p>';
    try { await item[2](); } catch (err) { document.getElementById('contenido').innerHTML = `<p class="card vacio">${esc(err.message)}</p>`; }
  },
};

App.iniciar();
