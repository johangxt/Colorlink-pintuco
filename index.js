const config = require('./src/config');
const { createRepo } = require('./src/db');
const { createApp } = require('./src/app');

module.exports = createApp({ repo: createRepo(), config });