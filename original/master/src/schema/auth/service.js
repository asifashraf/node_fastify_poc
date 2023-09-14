const Axios = require('axios');
const config = require('../../../config');
const { singleSignOnStatusName, otpRequestError } = require('../root/enums');
const { customerRequestEmailVerificationError } = require('./enums');
const { formatError } = require('../../lib/util');
const { isNumber } = require('lodash');
const { parsePhoneNumber } = require('libphonenumber-js');
const SlackWebHookManager = require('../slack-webhook-manager/slack-webhook-manager');
class AuthService {
  constructor() {
    this.axios = Axios.create({
      baseURL: config.authServiceUrl,
      timeout: config.authServiceTimeout,
    });
  }

  async generateToken(ctx) {
    const { data } = await this.axios.post('/generate-token', null, {
      headers: { authorization: ctx.req.headers.authorization },
    });

    return data;
  }

  async update(ctx, customer) {
    return this.axios.post(
      '/update',
      {
        id: customer.id,
        phoneNumber: customer.phoneNumber,
        email: customer.email,
        password: customer.password,
      },
      {
        headers: { authorization: ctx.req.headers.authorization },
      }
    );
  }

  async requestPhoneOTP(phoneNumber, isAdmin) {
    let status = false;
    try {
      const response = await this.axios.post('/sendOTPSms', {
        phoneNumber,
        isAdmin
      });
      status = response.status === 200;
    } catch (err) {
      return this.otpErrorResponse('OTP', status, err);
    }
    return {
      status,
    };
  }

  async requestPhoneVoiceOTP(phoneNumber, isAdmin) {
    let status = false;
    try {
      const response = await this.axios.post('/sendVoiceOTP', {
        phoneNumber,
        isAdmin
      });
      status = response.status === 200;
    } catch (err) {
      return this.otpErrorResponse('VOICEOTP', status, err);
    }
    return {
      status,
    };
  }

  otpErrorResponse(base, status, err) {
    console.log(base, 'Request-Error : ', err);

    let error = otpRequestError.SERVICE_ERROR;
    let errorBody;
    if (err && err.response && err.response.data) {
      const { rateLimitExceeded, countryAvailable, lockDurationInSeconds: lockSeconds, maxAttempt } = err.response.data;
      if (countryAvailable === false) {
        return {
          status: false,
          error: otpRequestError.COUNTRY_IS_NOT_AVAILABLE
        };
      }
      if (rateLimitExceeded) {
        error = otpRequestError.RATE_LIMIT_EXCEEDED;
        errorBody = {
          lockDurationInSeconds: -1,
          lockDurationInMins: -1,
          lockDurationInHours: -1,
          maxAttempt: -1,
        };

        if (lockSeconds && maxAttempt) {
          const seconds = lockSeconds && isNumber(lockSeconds) ? Number(lockSeconds) : -1;
          const mins = seconds > 0 ? seconds / 60 : -1;
          const hours = mins > 0 ? mins / 60 : -1;
          const maxAttemptVal = maxAttempt && isNumber(maxAttempt) ? Number(maxAttempt) : -1;
          errorBody = {
            lockDurationInSeconds: seconds,
            lockDurationInMins: mins,
            lockDurationInHours: hours,
            maxAttempt: maxAttemptVal,
          };
        }
      }
    }
    return {
      status: false,
      error,
      errorBody,
    };
  }

  async validatePhoneOTP(phoneNumber, otpCode) {
    try {
      // OTP Challenge Succeeds - Existing User, Service Provides Auth Tokens
      const response = await this.axios.post('/validateOTPSms', {
        phoneNumber,
        otpCode,
      });
      // response data includes an access and a refresh token
      return {
        ...response.data,
        status: singleSignOnStatusName.SUCCESS_EXISTING_USER,
      };
    } catch (err) {
      if (err.response.status === 400) {
        // Technically 404 response is not an error, rather notifies that user record doesn't exists
        // OTP Code Challenge Failed
        return {
          token: null,
          refreshToken: null,
          status: singleSignOnStatusName.FAILED_OTP_CHALLENGE,
          error: singleSignOnStatusName.FAILED_OTP_CHALLENGE,
        };
      } else if (err.response.status === 404) {
        // OTP Challenge Succeeds - New User (No Record Found, Continues with Register)
        return {
          token: null,
          refreshToken: null,
          status: singleSignOnStatusName.SUCCESS_NO_USER_RECORD_FOUND,
        };
      } else if (err.response.status === 406) {
        // OTP Challenge Succeeds but All records with given phoneNumber are disabled
        return {
          token: null,
          refreshToken: null,
          status: singleSignOnStatusName.USER_RECORDS_ARE_DISABLED,
          error: singleSignOnStatusName.USER_RECORDS_ARE_DISABLED,
        };
      } else if (err.response.status === 409) {
      // OTP Challenge Succeeds but there are multiple active customer records
        return {
          token: null,
          refreshToken: null,
          status: singleSignOnStatusName.DUPLICATE_ACTIVE_RECORDS_FOUND,
          error: singleSignOnStatusName.DUPLICATE_ACTIVE_RECORDS_FOUND,
        };
      }
      // Service Error
      return {
        token: null,
        refreshToken: null,
        status: singleSignOnStatusName.SERVICE_ERROR,
        error: singleSignOnStatusName.SERVICE_ERROR,
      };
    }
  }

  async requestEmailVerification(userEmail) {
    try {
      const { data } = await this.axios.post('/sendVerificationMail', {
        userEmail,
      });
      if (data.status === 'OK') {
        return {
          status: true,
        };
      } else if (data.status === 'MAIL_SENDING_ERROR') {
        return {
          ...formatError(
            [customerRequestEmailVerificationError.MAIL_SENDING_ERROR],
            userEmail
          ),
          status: false,
        };
      }
      console.log('Unknown status on requestEmailVerification :', data);
      return {
        ...formatError(
          [customerRequestEmailVerificationError.UNKNOWN_STATUS],
          userEmail
        ),
        status: false,
      };
    } catch (err) {
      console.log('requestEmailVerification : ', err);
      return {
        ...formatError(
          [customerRequestEmailVerificationError.SERVICE_ERROR],
          userEmail
        ),
        status: false,
      };
    }
  }

  async requestNewToken(refreshToken) {
    try {
      const token = refreshToken.replace('Bearer ', '');
      const response = await this.axios.post('/refresh', null, {
        headers: {
          authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (err) {
      console.log('Request new token : ', err);
      return null;
    }
  }

  async requestViewCustomerOTPCode(ctx, phoneNumber) {
    const config = ctx.req.headers.authorization
      ? {
        headers: { authorization: ctx.req.headers.authorization },
      }
      : {};
    const { data } = await this.axios.post(
      '/viewOtpCode',
      {
        phoneNumber,
      },
      config
    );

    return data;
  }

  async requestResetCustomerResetOTPRateLimit(ctx, phoneNumber) {
    const config = ctx.req.headers.authorization
      ? {
        headers: { authorization: ctx.req.headers.authorization },
      }
      : {};
    const res = await this.axios.post(
      '/resetOtpRateLimit',
      {
        phoneNumber,
      },
      config
    );
    return res.status == 200;
  }

  async firstTimeUsersOTPList() {
    const response = await this.axios.get('/nonRegisteredOTPs');
    return response.data;
  }

  async jwtExpireTimes() {
    let status = false;
    try {
      const response = await this.axios.get('/jwtExpireTimes');
      status = response.status === 200;
      return {
        status,
        response
      };
    } catch (err) {
      console.log('[jwtExpireTimes]', err);
    }
    return {
      status: false,
      response: {
        data: {
          accessTokenExpire: null,
          refreshTokenExpire: null,
        },
      }
    };
  }

  getDeviceInformation(ctx) {
    const req = ctx.req;
    const ip = req.clientIp;
    const deviceId = (req && req.headers && req.headers.deviceId || req.headers.deviceid)
      ? (req.headers.deviceId || req.headers.deviceid)
      : undefined;
    const deviceIdentifierType = (req && req.headers && req.headers.deviceIdentifierType || req.headers.deviceidentifiertype)
      ? (req.headers.deviceIdentifierType || req.headers.deviceidentifiertype)
      : undefined;
    const clientVer = (req && req.headers && req.headers['apollographql-client-version'])
      ? req.headers['apollographql-client-version']
      : undefined;
    const clientOs = (req && req.headers && req.headers['apollographql-client-name'])
      ? req.headers['apollographql-client-name']
      : undefined;
    const clientUserAgent = (req && req.headers && req.headers['user-agent'])
      ? req.headers['user-agent']
      : undefined;
    return { ip, deviceId, deviceIdentifierType, clientVer, clientOs, clientUserAgent };
  }

  getUniqueKeyInformation(ctx) {
    const { ip, deviceId, clientVer, clientOs, clientUserAgent } = this.getDeviceInformation(ctx);
    if (deviceId) {
      return deviceId;
    } else {
      const identityKey = `${ip}_${clientOs || 'unk'}_${clientVer || 'unk'}_${clientUserAgent || 'unk'}`;
      return identityKey.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    }
  }

  async isValidAdid(ctx, phoneNumber) {
    const { deviceId, deviceIdentifierType } = this.getDeviceInformation(ctx);
    let result = false;
    let message = '';
    try {
      if (deviceIdentifierType && deviceId) {
        const cfg = {
          url: config.adjust.urlForInspectDevice,
          timeout: 5000,
          method: 'GET',
          headers: {
            authorization: `Bearer ${config.adjust.apiToken}`
          },
          params: {
            advertising_id: deviceId,
            app_token: config.adjust.appToken,
            format: 'json',
          },
        };
        const response = await Axios(cfg);
        result = response.status === 200;
        message = response?.data;
        if (message
          && message.TrackerName
          && message?.TrackerName?.includes('Untrusted Devices')) {
          result = false;
        } else {
          result = true;
        }
      } else {
        result = null;
      }
    } catch (error) {
      //result = false;
      result = null;
      message = error?.response?.data;
    }
    ctx.kinesisLogger.sendLogEvent({ phoneNumber, message, result }, 'customerRequestOTP-AdId-Inspect').then(r => console.log(r));
    return result;
  }

  async isIdentityBlocked(ctx, identity) {
    const { redis } = ctx;
    const key = this.getRedisBlockKey(identity);
    const val = await redis.get(key);
    if (val) {
      return true;
    }
    return false;
  }

  async deleteIdentityBlock(ctx) {
    const { redis } = ctx;
    const identity = this.getUniqueKeyInformation(ctx);
    const key = this.getRedisBlockKey(identity);
    await redis.del(key);
  }

  async setIdentityStats(ctx, phoneNumber) {
    const identity = this.getUniqueKeyInformation(ctx);
    if (identity) {
      const cleanPhoneNumber = phoneNumber.trim();
      const { redis } = ctx;
      const key = this.getRedisListedKey(identity);
      let cachedContent = await redis.get(key);
      if (!cachedContent) {
        cachedContent = {};
      } else {
        cachedContent = JSON.parse(cachedContent);
      }
      if (cachedContent) {
        if (cachedContent[cleanPhoneNumber]) {
          cachedContent[cleanPhoneNumber]++;
        } else {
          cachedContent[cleanPhoneNumber] = 1;
        }
        redis.set(key, JSON.stringify(cachedContent));
      }
      //const totalRequest = Object.entries(cachedContent).reduce((a, b) => a + b, 0);
      const totalDifferentRequest = Object.entries(cachedContent).length;
      if (totalDifferentRequest > config.otpBlock.limit) {
        const blockKey = this.getRedisBlockKey(identity);
        const tryingDates = await redis.get(blockKey);
        const tryingDatesArray = tryingDates ? JSON.parse(tryingDates) : [];
        tryingDatesArray.push(new Date().toISOString());
        await redis.set(blockKey, JSON.stringify(tryingDatesArray));
        ctx.kinesisLogger.sendLogEvent({
          phoneNumber,
          blockKey,
          cachedContent,
        }, 'customerRequestOTP-AdId-Blocked').catch(r => console.log(r));
        SlackWebHookManager.sendTextToSlack(`[!!!OTP-UniqueId-Blocked!!!] ${JSON.stringify({
          phoneNumber,
          blockKey,
          cachedContent,
        })}`, config.otpBlock.slackUrl)
          .catch(r => console.log(r));
      }
    }
  }

  getRedisBlockKey(identity) {
    return `otp:blocked:${identity}`;
  }

  getRedisListedKey(identity) {
    return `otp:requestedList:${identity}`;
  }

  async statusIdentity(ctx, phoneNumber) {
    return Promise.all([
      this.isExistCustomer(ctx, phoneNumber),
      this.isExistOTPValidation(ctx, phoneNumber),
      this.isUntrustedByAdjust(ctx, phoneNumber),
      this.isExceededLimitForDifferentPhoneNumber(ctx),
      this.isPhoneNumberInActiveCountry(ctx, phoneNumber),
      this.isSMSEnabledForRequestedCountry(ctx, phoneNumber),
    ]);
  }

  async checkStatus(ctx, phoneNumber) {
    let finalStatus = true;
    try {
      await this.setIdentityStats(ctx, phoneNumber);
      const [
        isExistCustomer,
        isExistOTPValidation,
        isUntrustedByAdjust,
        isExceededLimitForDifferentPhoneNumber,
        isPhoneNumberInActiveCountry,
        isSMSEnabledForRequestedCountry,
      ] = await this.statusIdentity(ctx, phoneNumber);

      if (isSMSEnabledForRequestedCountry === true) {
        if (isExistCustomer === true) {
          await this.deleteIdentityBlock(ctx);
          finalStatus = true;
        } else {
          if (isExistOTPValidation === true) {
            await this.deleteIdentityBlock(ctx);
            finalStatus = true;
          } else {
            if (isExceededLimitForDifferentPhoneNumber === true) {
              finalStatus = false;
            } else {
              if (isPhoneNumberInActiveCountry === false && isUntrustedByAdjust === true) {
                finalStatus = false;
              } else {
                finalStatus = true;
              }
            }
          }
        }
      } else {
        finalStatus = false;
      }

      const logPayload = {
        uniqueKey: this.getUniqueKeyInformation(ctx),
        phoneNumber,
        isSMSEnabledForRequestedCountry,
        isExistCustomer,
        isExistOTPValidation,
        isUntrustedByAdjust,
        isExceededLimitForDifferentPhoneNumber,
        isPhoneNumberInActiveCountry,
        finalStatus
      };
      ctx.kinesisLogger.sendLogEvent(logPayload, 'customerRequestOTP-CheckStatus').catch(r => console.log(r));
      if (!finalStatus) {
        SlackWebHookManager.sendTextToSlack(`[!!!OTP-SMS-REJECTED!!!] ${JSON.stringify(logPayload)}`
          , config.otpBlock.slackUrl)
          .catch(r => console.log(r));
      }
    } catch (error) {
      // if we can not handle all condition, go on no block
      finalStatus = true;

      ctx.kinesisLogger.sendLogEvent({
        uniqueKey: this.getUniqueKeyInformation(ctx),
        phoneNumber,
        finalStatus,
        error: error.message,
        stack: JSON.stringify(error.stack || {}),
      }, 'customerRequestOTP-CheckStatus-Error').catch(r => console.log(r));
    }

    return finalStatus;
  }

  async isExistCustomer(ctx, phoneNumber) {
    const customer = await ctx.authCustomer.getActiveByPhoneNumber(phoneNumber);
    return customer != null;
  }

  async isExistOTPValidation(ctx, phoneNumber) {
    const stats = await ctx.db
      .raw(`select
            (case
              when oal.operation_type = 'REQUEST_LOGIN_OTP' then 'req'
              when oal.operation_type = 'REQUEST_LOGIN_OTP_VOICE' then 'req'
              when oal.operation_type = 'REQUEST_SIGNUP_OTP' then 'req'
              when oal.operation_type = 'REQUEST_SIGNUP_OTP_VOICE' then 'req'
              when oal.operation_type = 'VALIDATE_LOGIN_OTP' then 'val'
              when oal.operation_type = 'VALIDATE_SIGNUP_OTP' then 'val'
              when oal.operation_type = 'VALIDATION_FAIL' then 'val'
            end) opname,
            count(*)
          from
            public.otp_activity_logs oal
          where
            oal.identifier = ?
            and oal.operation_type in (
          'REQUEST_LOGIN_OTP',
          'REQUEST_LOGIN_OTP_VOICE',
          'REQUEST_SIGNUP_OTP',
          'REQUEST_SIGNUP_OTP_VOICE',
          'VALIDATE_LOGIN_OTP',
          'VALIDATE_SIGNUP_OTP',
          'VALIDATION_FAIL'
          )
          group by
            opname`, [phoneNumber]);

    const reqCount = stats.rows.find(x => x.opname === 'req')?.count || 0;
    const valCount = stats.rows.find(x => x.opname === 'val')?.count || 0;

    if (reqCount != null && valCount != null) {
      return valCount > 0 ? true : null;
    } else {
      return null;
    }
  }

  async isPhoneNumberInActiveCountry(ctx, phoneNumber) {
    return true; // BYPASSED
    // const parsedPhoneNumber = parsePhoneNumber(phoneNumber);
    // const countryIsoCode = parsedPhoneNumber.country;
    // const country = await ctx.country.getActiveByIsoCode(countryIsoCode);
    // return country != null;
  }

  async isUntrustedByAdjust(ctx, phoneNumber) {
    const isValid = await this.isValidAdid(ctx, phoneNumber);
    return isValid === false;
  }

  async isExceededLimitForDifferentPhoneNumber(ctx) {
    const uniqueKey = this.getUniqueKeyInformation(ctx);
    const res = await this.isIdentityBlocked(ctx, uniqueKey);
    return res;
  }

  async isSMSEnabledForRequestedCountry(ctx, phoneNumber) {
    const parsedPhoneNumber = parsePhoneNumber(phoneNumber);
    const countryIsoCode = parsedPhoneNumber.country;
    const res = await ctx.otpAvailableCountries.getByIsoCode(countryIsoCode);
    if (res) {
      if (res.isSmsEnabled != null) {
        return res.isSmsEnabled;
      } else {
        return true;
      }
    } else {
      return false;
    }
  }
}

module.exports = AuthService;
