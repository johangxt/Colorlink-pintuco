const nodemailer = require('nodemailer');
const { httpError } = require('./util');

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Envío de correos con Gmail (contraseña de aplicación). Se puede inyectar otro "mailer" en pruebas.
function createMailer({ config }) {
  const { gmailUser, gmailPass } = config;
  let transporter;

  return {
    async enviarCodigo(para, nombre, codigo) {
      if (!gmailUser || !gmailPass) {
        // Sin credenciales: en desarrollo se muestra el código en consola; en producción es un error
        if (process.env.NODE_ENV === 'production') throw httpError(503, 'El servicio de correo no está configurado');
        console.log(`[correo] Sin credenciales de Gmail. Código para ${para}: ${codigo}`);
        return;
      }
      transporter = transporter || nodemailer.createTransport({
        host: 'smtp.gmail.com', port: 465, secure: true, auth: { user: gmailUser, pass: gmailPass },
      });
      try {
        await transporter.sendMail({
          from: `"ColorLink Pintuco" <${gmailUser}>`,
          to: para,
          subject: `Tu código de verificación: ${codigo}`,
          text: `Hola ${nombre}, tu código de verificación es ${codigo}. Vence en 10 minutos. Si no creaste una cuenta, ignora este mensaje.`,
          html: `<div style="font-family:Arial,sans-serif;max-width:420px">
            <h2 style="color:#0033A0">ColorLink Pintuco</h2>
            <p>Hola ${esc(nombre)}, usa este código para verificar tu correo:</p>
            <p style="font-size:34px;letter-spacing:8px;font-weight:bold;margin:18px 0">${esc(codigo)}</p>
            <p style="color:#555">Vence en 10 minutos. Si no creaste una cuenta, ignora este mensaje.</p>
          </div>`,
        });
      } catch (err) {
        console.error('[correo] Error enviando:', err.message);
        throw httpError(503, 'No se pudo enviar el correo de verificación. Intenta de nuevo.');
      }
    },
  };
}

module.exports = { createMailer };
