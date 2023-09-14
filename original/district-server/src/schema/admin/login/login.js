const Axios = require('axios');
const { loginError } = require('./enum');
const { formatError } = require('../../../lib/util');
const { firebaseLoginBaseURL, firebaseVerifyPassword, firebaseSignInKey, firebaseGetAccountInformation } = require('../../../../config');


class AdminLoginService {
  constructor(db, context) {
    this.context = context;
    this.axios = Axios.create({
      baseURL: firebaseLoginBaseURL,
      timeout: 6400,
    });
  }

  async initiateLogin({ email, password, returnSecureToken }) {
    const errors = this.validateLoginDetails({ email, password, returnSecureToken });
    if (errors.length > 0) return formatError(errors);
    try {
      const response = await this.axios.post(
        `${firebaseVerifyPassword}${firebaseSignInKey}`,
        { email, password, returnSecureToken }
      );
      this.context.kinesisLogger.sendLogEvent(
        response.data,
        'initiateLogin'
      );
      return { LoginData: response.data, error: null };
    } catch (err) {
      const errors = [];
      errors.push(loginError.UNKNOWN_ERROR);
      this.context.kinesisLogger.sendLogEvent(
        err.response.data,
        'initiateLoginVerifyPasswordError'
      );
      return formatError(errors);
    }
  }

  validateLoginDetails(loginDetails) {
    const errors = [];
    if (!loginDetails.email) errors.push(loginError.EMAIL_MISSING);
    if (!loginDetails.password) errors.push(loginError.PASSWORD_MISSING);
    if (!loginDetails.returnSecureToken) errors.push(loginError.RETURN_SECURE_TOKEN_MISSING);
    return errors;
  }

  async getAccountInfo(data) {
    try {
      const response = await this.axios.post(
        `${firebaseGetAccountInformation}${firebaseSignInKey}`,
        { idToken: data.LoginData.idToken }
      );
      this.context.kinesisLogger.sendLogEvent(
        response.data.users[0],
        'initiateLoginGetAccountInfo'
      );
      const userData = response.data.users[0];
      data.LoginData = {
        ...data.LoginData,
        passwordHash: userData.passwordHash,
        emailVerified: userData.emailVerified,
        validSince: userData.validSince,
        disabled: userData.disabled,
        lastLoginAt: userData.lastLoginAt,
        createdAt: userData.createdAt,
        lastRefreshAt: userData.lastRefreshAt,
      };
      return { LoginData: data.LoginData, error: null };
    } catch (err) {
      const errors = [];
      errors.push(loginError.UNKNOWN_ERROR);
      this.context.kinesisLogger.sendLogEvent(
        err.response.data.error,
        'initiateLoginGetAccountInfoError'
      );
      return formatError(errors);
    }

  }

}

module.exports = AdminLoginService;
