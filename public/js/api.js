// Cliente HTTP y utilidades compartidas del frontend
const Sesion = {
  get token() { return localStorage.getItem('pintuco_token'); },
  get usuario() { try { return JSON.parse(localStorage.getItem('pintuco_usuario')); } catch { return null; } },
  guardar(token, usuario) { localStorage.setItem('pintuco_token', token); localStorage.setItem('pintuco_usuario', JSON.stringify(usuario)); },
  cerrar() { localStorage.removeItem('pintuco_token'); localStorage.removeItem('pintuco_usuario'); localStorage.removeItem('pintuco_carrito'); },
};

async function api(ruta, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (Sesion.token) headers.Authorization = `Bearer ${Sesion.token}`;
  const res = await fetch(`/api${ruta}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && Sesion.token && !ruta.startsWith('/auth')) {
    Sesion.cerrar();
    location.reload();
  }
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

// Escapa texto para insertarlo de forma segura en HTML
function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const pesos = (n) => '$' + Number(n || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 });
const fecha = (iso) => (iso ? new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }) : '—');
const estrellas = (n) => '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n));
const ETIQUETA_ESTADO = { pendiente: 'Pendiente', aceptada: 'Aceptada', en_proceso: 'En proceso', completada: 'Completada', cancelada: 'Cancelada' };
const chipEstado = (e) => `<span class="chip ${esc(e)}">${esc(ETIQUETA_ESTADO[e] || e)}</span>`;

let toastTimer;
function toast(msg, error = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (error ? ' error' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('oculto'), 3500);
}

function modal(html) {
  const fondo = document.createElement('div');
  fondo.className = 'modal-fondo';
  fondo.innerHTML = `<div class="card modal">${html}</div>`;
  fondo.addEventListener('click', (e) => { if (e.target === fondo) fondo.remove(); });
  document.body.appendChild(fondo);
  return { el: fondo, cerrar: () => fondo.remove() };
}

const datosForm = (form) => Object.fromEntries(new FormData(form).entries());
