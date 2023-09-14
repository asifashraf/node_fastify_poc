const jwt = require('jsonwebtoken');
const config = require('../../../config');
const { UnauthorizedError } = require('../../schema/auth/errors');
const {
  calculateDriverTokenKey,
  getDriverTokenKey,
} = require('../../schema/driver/redis-helper');

const expressDeliveryMiddleware = async (req, res, next) => {
  try {
    if (
      req.headers.authorization &&
      req.headers.authorization.split(' ')[0].toUpperCase() === 'BEARER'
    ) {
      const token = req.headers.authorization.split(' ')[1];
      const secret = Buffer.from(config.expressDelivery.jwt.secret, 'base64');
      const payload = jwt.verify(token, secret);
      req.orderSetId = payload.orderSetId;
      req.driverId = payload.driverId;
      const targetKey = calculateDriverTokenKey(payload.orderSetId, payload.driverId);
      const cachedToken = await getDriverTokenKey(targetKey);
      if (cachedToken && cachedToken?.token?.accessToken == token) {
        return next();
      }
    }
    return res.status(401).send({
      error: 'Unauthorized',
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return res.status(401).send({
        error: err.message,
      });
    }
    if (err.response && err.response.status === 401) {
      return res.status(err.response.status).send({
        error: err.response.data.error || 'Unable to authenticate user',
      });
    }
    return res.status(401).send({
      error: 'Unauthorized',
    });
  }
};

module.exports = expressDeliveryMiddleware;
