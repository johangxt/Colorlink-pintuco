require('dotenv').config({ quiet: true });

const config = {
  port: Number(process.env.PORT) || 3000,
  // 'supabase' (producción) o 'memory' (demostración / pruebas, sin base de datos externa)
  dbProvider: process.env.DB_PROVIDER || (process.env.SUPABASE_URL ? 'supabase' : 'memory'),
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  jwtSecret: process.env.JWT_SECRET || 'cambia-este-secreto-en-produccion',
  jwtExpires: process.env.JWT_EXPIRES || '8h',
  // Correo (verificación de cuenta) con Gmail + contraseña de aplicación
  gmailUser: process.env.GMAIL_USER,
  gmailPass: (process.env.GMAIL_APP_PASSWORD || '').replace(/\s/g, ''),
  // Chatbot: 'gemini' u 'openai'
  aiProvider: (process.env.AI_PROVIDER || 'openai').toLowerCase(),
  aiModel: process.env.AI_MODEL,
  geminiKey: process.env.GEMINI_API_KEY,
  openaiKey: process.env.OPENAI_API_KEY,
  // Porcentaje adicional de pintura por desperdicio en la calculadora
  factorDesperdicio: Number(process.env.FACTOR_DESPERDICIO ?? 0.1),
};

module.exports = config;
