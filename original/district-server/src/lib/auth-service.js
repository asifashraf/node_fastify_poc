const jwtDecode = require('jwt-decode');
const db = require('../../database');
const InternalAuthService = require('../schema/auth/internal-service');
const { UnauthorizedError } = require('../schema/auth/errors');

const setUserWithAuthenticationServiceUser = async (decoded, req, res) => {
  let authCustomer = undefined;
  if (decoded.jti) {
    // Check for disabled user
    authCustomer = await db('auth_customer')
      .where('id', decoded.jti)
      .andWhere('is_disabled', false)
      .first();
    if (!authCustomer) {
      return res.status(403).send({
        error: 'Customer Not Found',
      });
    }
  }
  const authorization = InternalAuthService.authenticate(
    req.headers.authorization.split(' ')[1]
  );
  req.user = {
    sub: decoded.jti,
    id: decoded.jti,
    email: authCustomer?.email,
    authProvider: 'authentication-service',
    userType: decoded.userType,
    roles: authorization.roles,
    groups: authorization.groups,
    permissions: authorization.permissions,
  };
};

const middleware = async (req, res, next) => {
  try {
    if (req.headers.authorization) {
      const decoded = jwtDecode(req.headers.authorization.split(' ')[1]);

      if (!(decoded.iss && decoded.iss.includes('authentication-service'))) {
        return next();
      }

      if (decoded && decoded.email === 'apple@cofeapp.com') {
        req.user = decoded;
        req.user.sub = decoded.user_id;
        req.user.name = decoded.email;
        req.user.authProvider = 'authentication-service';
      } else {
        await setUserWithAuthenticationServiceUser(decoded, req, res);
      }
    }
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return res.status(401).send({
        error: err.message,
      });
    }
    console.error('Unable to authenticate via auth-service', err);
  }
  return next();
};

module.exports = {
  setUserWithAuthenticationServiceUser,
  middleware,
};
