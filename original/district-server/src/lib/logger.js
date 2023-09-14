const { isProd, loggerParameter } = require('../../config');
const pino = require('pino');
const logger = pino({
  level: isProd ? 'info' : 'debug',
  sync: loggerParameter.sync,
});
module.exports.logger = logger;
