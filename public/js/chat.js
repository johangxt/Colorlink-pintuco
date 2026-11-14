// Widget del chatbot con IA (PintuBot)
const Chat = {
  cargado: false,
  init() {
    const caja = document.getElementById('chat');
    document.getElementById('chat-toggle').addEventListener('click', () => { caja.classList.toggle('oculto'); if (!caja.classList.contains('oculto')) this.abrir(); });
    document.getElementById('chat-cerrar').addEventListener('click', () => caja.classList.add('oculto'));
    document.getElementById('chat-limpiar').addEventListener('click', async () => {
      await api('/chat/historial', { method: 'DELETE' }).catch(() => {});
      document.getElementById('chat-msgs').innerHTML = '';
      this.bienvenida();
    });
    document.getElementById('chat-form').addEventListener('submit', (e) => { e.preventDefault(); this.enviar(); });
  },
  async abrir() {
    document.getElementById('chat-input').focus();
    if (this.cargado) return;
    this.cargado = true;
    try {
      const estado = await api('/chat/estado');
      if (!estado.disponible) this.agregar('sistema', 'El chatbot aún no tiene clave de IA configurada. El administrador debe agregarla en el archivo .env.');
      const historial = await api('/chat/historial');
      if (!historial.length) this.bienvenida();
      historial.forEach((m) => this.agregar(m.rol, m.contenido));
    } catch (err) { this.agregar('sistema', err.message); }
  },
  bienvenida() {
    this.agregar('assistant', `¡Hola, ${Sesion.usuario?.nombre?.split(' ')[0] || ''}! Soy PintuBot 🎨. Puedo recomendarte pinturas, calcular cuántos galones necesitas según los m² y explicarte cómo usar ColorLink. ¿En qué te ayudo?`);
  },
  agregar(rol, texto) {
    const div = document.createElement('div');
    div.className = `msg ${rol}`;
    div.textContent = texto;
    const cont = document.getElementById('chat-msgs');
    cont.appendChild(div);
    cont.scrollTop = cont.scrollHeight;
    return div;
  },
  async enviar() {
    const input = document.getElementById('chat-input');
    const mensaje = input.value.trim();
    if (!mensaje) return;
    input.value = '';
    this.agregar('user', mensaje);
    const pensando = this.agregar('assistant', 'Escribiendo…');
    try {
      const { respuesta } = await api('/chat', { method: 'POST', body: { mensaje } });
      pensando.textContent = respuesta;
    } catch (err) {
      pensando.className = 'msg sistema';
      pensando.textContent = err.message;
    }
  },
};
