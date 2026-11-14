const config = require('../config');
const { createMemoryRepo } = require('./memory');
const { createSupabaseRepo } = require('./supabase');

function createRepo() {
  if (config.dbProvider === 'supabase') {
    return createSupabaseRepo({ url: config.supabaseUrl, key: config.supabaseKey });
  }
  return createMemoryRepo();
}

module.exports = { createRepo };
