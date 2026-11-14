module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: ['src/**/*.js', '!src/server.js', '!src/db/supabase.js', '!src/db/index.js'],
  coverageReporters: ['text', 'text-summary', 'json-summary'],
};
