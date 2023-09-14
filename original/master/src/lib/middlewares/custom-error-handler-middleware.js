const kinesisLogger = require('./../aws-kinesis-logging');

// eslint-disable-next-line no-unused-vars
const middleware = async (err, req, res, next) => {
  const { name, stack, message } = err || {};
  kinesisLogger.sendLogEvent({ req, name, stack, message }, 'global-express-data-error');

  // NOTE: from express-jwt
  if (err.name === 'UnauthorizedError') {
    res.status(401).send('Unauthorized');
    return;
  }

  // NOTE: from node-jsonwebtokens
  if (err.name === 'TokenExpiredError') {
    res.status(401).send('Expired Token');
    return;
  }

  res.status(500).send('Internal Server Error');
};

module.exports = middleware;
