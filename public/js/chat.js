// Asesor de color con IA (PintuBot)
const Chat = {
  cargado: false,
  init() {
    $('#btn-ia').addEventListener('click', () => this.alternar());
    $('#chat-flotante').addEventListener('click', () => this.abrir());
    $('#chat-cerrar').addEventListener('click', () => this.cerrar());
    document.addEventListener('click', (e) => {
      const t = e.target.closest('[data-abrir-chat]');
      if (t) { e.preventDefault(); this.abrir(); }
    });
    $('#chat-limpiar').addEventListener('click', async () => {
      await api('/chat/historial', { method: 'DELETE' }).catch(() => {});
      $('#chat-msgs').innerHTML = '';
      $('#chat-sug').classList.remove('oculto');
      this.bienvenida();
    });
    $$('#chat-sug button').forEach((b) => b.addEventListener('click', () => { $('#chat-input').value = b.textContent; this.enviar(); }));
    $('#chat-form').addEventListener('submit', (e) => { e.preventDefault(); this.enviar(); });
  },
  alternar() { $('#chat').classList.contains('oculto') ? this.abrir() : this.cerrar(); },
  cerrar() { $('#chat').classList.add('oculto'); $('#chat-flotante').classList.remove('oculto'); },
  async abrir() {
    if (!Sesion.usuario) { Cuenta.abrir('Ingresa para hablar con PintuBot, nuestro asesor de color con IA.'); return; }
    $('#chat').classList.remove('oculto');
    $('#chat-flotante').classList.add('oculto');
    $('#chat-input').focus();
    if (this.cargado) return;
    this.cargado = true;
    try {
      const estado = await api('/chat/estado');
      if (!estado.disponible) this.agregar('sistema', 'El asesor aún no tiene clave de IA configurada (OPENAI_API_KEY en .env).');
      const historial = await api('/chat/historial');
      if (!historial.length) this.bienvenida();
      else $('#chat-sug').classList.add('oculto');
      historial.forEach((m) => this.agregar(m.rol, m.contenido));
    } catch (err) { this.agregar('sistema', err.message); }
  },
  bienvenida() {
    this.agregar('assistant', `¡Hola, ${esc(Sesion.usuario?.nombre?.split(' ')[0] || '')}! Soy PintuBot. Te ayudo a elegir color, calcular galones y usar la tienda. ¿Qué vas a pintar?`);
  },
  agregar(rol, texto) {
    const div = document.createElement('div');
    div.className = `msg ${rol}`;
    div.textContent = texto;
    const cont = $('#chat-msgs');
    cont.appendChild(div);
    cont.scrollTop = cont.scrollHeight;
    return div;
  },
  async enviar() {
    const input = $('#chat-input');
    const mensaje = input.value.trim();
    if (!mensaje) return;
    input.value = '';
    $('#chat-sug').classList.add('oculto');
    this.agregar('user', mensaje);
    const pensando = this.agregar('assistant', 'Escribiendo…');
    try {
      const { respuesta } = await api('/chat', { method: 'POST', body: { mensaje } });
      pensando.textContent = respuesta;
    } catch (err) {
      pensando.className = 'msg sistema';
      pensando.textContent = err.message;
    }
    $('#chat-msgs').scrollTop = $('#chat-msgs').scrollHeight;
  },
  reiniciar() { this.cargado = false; $('#chat-msgs').innerHTML = ''; },
};
