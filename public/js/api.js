// Cliente HTTP y utilidades compartidas del frontend
const Sesion = {
  get token() { return localStorage.getItem('pintuco_token'); },
  get usuario() { try { return JSON.parse(localStorage.getItem('pintuco_usuario')); } catch { return null; } },
  get rol() { return this.usuario?.rol || 'visitante'; },
  guardar(token, usuario) { localStorage.setItem('pintuco_token', token); localStorage.setItem('pintuco_usuario', JSON.stringify(usuario)); },
  cerrar() { ['pintuco_token', 'pintuco_usuario', 'pintuco_carrito'].forEach((k) => localStorage.removeItem(k)); },
};

async function api(ruta, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (Sesion.token) headers.Authorization = `Bearer ${Sesion.token}`;
  const res = await fetch(`/api${ruta}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && Sesion.token && !ruta.startsWith('/auth')) {
    Sesion.cerrar();
    location.hash = '#/';
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
const fecha = (iso) => (iso ? new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const estrellas = (n) => '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n));
const ETIQUETA_ESTADO = { pendiente: 'Pendiente', aceptada: 'Aceptada', en_proceso: 'En proceso', completada: 'Completada', cancelada: 'Cancelada' };
const ORDEN_ESTADO = ['pendiente', 'aceptada', 'en_proceso', 'completada'];
const chipEstado = (e) => `<span class="estado ${esc(e)}">${esc(ETIQUETA_ESTADO[e] || e)}</span>`;

let toastTimer;
function toast(msg, error = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (error ? ' error' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('oculto'), 3600);
}

function modal(html, { ancho = false } = {}) {
  const fondo = document.createElement('div');
  fondo.className = 'modal-fondo';
  fondo.innerHTML = `<div class="modal ${ancho ? 'ancho' : ''}" role="dialog"><button class="icono-btn cerrar" aria-label="Cerrar">✕</button>${html}</div>`;
  const cerrar = () => fondo.remove();
  fondo.addEventListener('click', (e) => { if (e.target === fondo) cerrar(); });
  fondo.querySelector('.cerrar').addEventListener('click', cerrar);
  document.body.appendChild(fondo);
  return { el: fondo, cerrar };
}

const datosForm = (form) => Object.fromEntries(new FormData(form).entries());
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// Confirmación en dos clics (evita diálogos bloqueantes del navegador)
function confirmarAccion(boton, texto = '¿Seguro? Clic de nuevo') {
  if (boton.dataset.confirmado) return true;
  boton.dataset.confirmado = '1';
  const original = boton.textContent;
  boton.textContent = texto;
  setTimeout(() => { delete boton.dataset.confirmado; boton.textContent = original; }, 3000);
  return false;
}
