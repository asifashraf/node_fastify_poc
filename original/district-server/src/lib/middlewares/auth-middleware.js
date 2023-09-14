const firebase = require('../firebase');
const AuthService = require('../auth-service');
const jwtDecode = require('jwt-decode');
const { UnauthorizedError } = require('../../schema/auth/errors');

const deniedMuatationList = [
  'saveBankCard',
  'saveBank',
  'saveBrandSubscriptionModel',
  'savePaymentGatewayCharge'
];


const middleware = async (req, res, next) => {
  try {
    if (
      req.headers.authorization &&
      req.headers.authorization.split(' ')[0].toUpperCase() === 'BEARER'
    ) {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwtDecode(token);

      // TODO: WHY? Not secure!
      if (decoded && decoded.email === 'apple@cofeapp.com') {
        req.user = decoded;
        req.user.sub = decoded.user_id;
        req.user.name = decoded.email;
        req.user.authProvider = decoded.firebase
          ? 'firebase'
          : 'authentication-service';
        return next();
      }

      if (decoded.iss && decoded.iss.includes('authentication-service')) {
        // from mobile
        await AuthService.setUserWithAuthenticationServiceUser(
          decoded,
          req,
          res
        );
      } else {
        // from web (using firebase)
        await firebase.setUserWithFirebaseUser(decoded, req);
        const query = req.body.query;
        if (query && query.startsWith('mutation')) {
          deniedMuatationList.map(mutation => {
            if (query.includes(mutation)) {
              throw 'Error';
            }
          });
        }
      }
    }
    return next();
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

module.exports = middleware;
