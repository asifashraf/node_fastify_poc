const config = require('../../../config');
const moment = require('moment');
const jwt = require('jsonwebtoken');
const {
  kinesisEventTypes: { authCustomerSaveError }, kinesisEventTypes,
} = require('../../lib/aws-kinesis-logging');
const SlackWebHookManager = require('../slack-webhook-manager/slack-webhook-manager');
const { parsePhoneNumber } = require('libphonenumber-js');
const Axios = require('axios');
const OTPService = require('./otp-service');
const { OTPTypes, OTPOperationTypes, userTypes,
  customerRequestEmailVerificationError, providerPrioties, OTPProviders
} = require('./enums');
const { otpRequestError, singleSignOnStatusName, customerAnalyticsEvents } = require('../root/enums');
const { TokenExpiredError } = require('jsonwebtoken');
const { UnauthorizedError } = require('./errors');
const { formatError } = require('../../lib/util');
const {
  notificationMedia,
  notificationProviders,
  notificationActions
} = require('../../notifications/enums');
const path = require('path');
const fs = require('fs');
const { template } = require('lodash');
const { publishEvent } = require('../../lib/event-publisher');
const { Topic } = require('../../lib/event-publisher/enums');
class InternalAuthService {
  constructor(context) {
    this.context = context;
  }

  async registerCustomer(context, customer) {
    const data = {
      id: customer.id,
      phoneNumber: customer.phoneNumber,
      email: customer.email,
      password: customer.password,
      created: customer.created || moment().toISOString(),
      updated: customer.updated || moment().toISOString(),
    };

    // save authCustomer
    this.context.authCustomer
      .save(data)
      .then(() => {
        console.log(`authCustomer is created for customerId: ${data.id}`);
      })
      .catch(err => {
        console.log(
          `authCustomer isn't created for customerId: ${data.id} | err ${err}`,
        );
        this.context.kinesisLogger.sendLogEvent(
          { customerId: data.id, error: err },
          authCustomerSaveError,
        );
      });

    return this.generateToken(data);
  }

  async generateToken({ id, phoneNumber }) {
    const payload = tokenTypeVal => {
      return {
        userType: 'CUSTOMER',
        tokenType: tokenTypeVal,
      };
    };

    const accessTokenExpireTime = Number(config.jwt.accessTokenExpire);
    const refreshTokenExpireTime = Number(config.jwt.refreshTokenExpire);

    // return jwt
    const secret = Buffer.from(config.jwt.secret, 'base64');

    const tokenVal = jwt.sign(payload('ACCESS'), secret, {
      expiresIn: accessTokenExpireTime,
      algorithm: 'HS512',
      issuer: config.jwt.issuer,
      jwtid: id,
      subject: phoneNumber,
      header: { typ: undefined },
    });
    const refreshTokenVal = jwt.sign(payload('REFRESH'), secret, {
      expiresIn: refreshTokenExpireTime,
      algorithm: 'HS512',
      issuer: config.jwt.issuer,
      jwtid: id,
      subject: phoneNumber,
      header: { typ: undefined },
    });

    return {
      token: {
        accessToken: tokenVal,
        expiresIn: accessTokenExpireTime,
        tokenType: 'Bearer',
      },
      refreshToken: {
        accessToken: refreshTokenVal,
        expiresIn: refreshTokenExpireTime,
        tokenType: 'Bearer',
      },
      status: null,
    };
  }

  refreshToken(refreshToken) {
    const authentication = InternalAuthService.authenticate(refreshToken);
    return this.generateToken({
      id: authentication.userId,
      phoneNumber: authentication.phoneNumber,
    });
  }

  static authenticate(token) {
    try {
      const secret = Buffer.from(config.jwt.secret, 'base64');
      const payload = jwt.verify(token, secret);
      const authorization = {
        userType: payload.userType,
        userId: payload.jti,
        phoneNumber: payload.sub,
        tokenType: payload.tokenType,
        groups: [],
        roles: [],
        permissions: []
      };
      /**
       * if admin role and permission wanted to be filled here;
       * because of this is a static method, knex instance
       * should be used directly
       */
      if (payload.userType === userTypes.CUSTOMER) {
        authorization.roles.push('CUSTOMER');
      }
      return authorization;
    } catch (err) {
      let message = 'Unauthorized';
      if (err instanceof TokenExpiredError) {
        message = 'Authentication token is expired';
      }
      throw new UnauthorizedError(message);
    }
  }

  async requestEmailVerification(customer) {
    try {
      await this.context.notification.sendNotificationContentToQueue(
        notificationMedia.EMAIL,
        notificationProviders.AWS_SES,
        this.generateEmailVerificationNotificationContent(customer),
        notificationActions.CUSTOMER_EMAIL_VERIFICATION
      );
      return {
        status: true,
      };
    } catch (err) {
      return {
        ...formatError(
          [customerRequestEmailVerificationError.MAIL_SENDING_ERROR],
          customer.email,
        ),
        status: false,
      };
    }
  }

  generateEmailVerificationNotificationContent(customer) {
    const templateDir = path.resolve('templates', 'dist', 'email-verification');
    const emailVerificationPath = path.join(
      templateDir,
      'email-verification.html'
    );
    const emailVerificationFile = fs.readFileSync(
      emailVerificationPath,
      'utf8'
    );
    const emailVerificationTemplate = template(emailVerificationFile);
    const html = emailVerificationTemplate({
      destinationMail: customer.email,
      redirectUrl: `${config.basePath}/customer-cb/verify-email/?cid=${customer.id}`,
      country: customer.phoneCountry,
    });

    const text = html;
    const subject = 'COFE - Verify your email';

    return {
      receiverEmail: customer.email,
      subject,
      html,
      text,
    };
  }

  requestViewCustomerOTPCode(phoneNumber) {
    const otpService = new OTPService({
      phoneNumber,
      options: {
        ignoreRateLimit: true
      }
    });
    return otpService.getOTPCodeFromDB();
  }

  async requestResetCustomerResetOTPRateLimit(phoneNumber) {
    try {
      const otpService = new OTPService({
        phoneNumber,
        options: {
          ignoreRateLimit: true
        }
      });
      await otpService.resetOTPRateLimit();
      return true;
    } catch (err) {
      return false;
    }
  }

  async requestSMSOTP(phoneNumber, isAdmin, providerPriority) {
    const otpService = new OTPService({
      phoneNumber,
      providerPriority,
      options: {
        ignoreRateLimit: Boolean(isAdmin),
        forceToUseMockProvider: Boolean(isAdmin),
      }
    });
    const response = await otpService.sendOTP(OTPTypes.SMS);
    if (response.error === otpRequestError.SERVICE_ERROR) {
      this.context.kinesisLogger.sendLogEvent(
        { response },
        kinesisEventTypes.otpError
      ).catch(err => console.log(err));
    }
    return response;
  }

  async validatePhoneOTP(phoneNumber, otpCode) {
    const otpService = new OTPService({
      phoneNumber,
      options: {
        ignoreRateLimit: true,
      }
    });
    const validationResult = await otpService.validateOTP(otpCode);
    if (!validationResult.status) {
      const error = validationResult.error === otpRequestError.DISABLED_CUSTOMER
        ? singleSignOnStatusName.USER_RECORDS_ARE_DISABLED
        : singleSignOnStatusName.FAILED_OTP_CHALLENGE;
      return {
        status: error,
        error,
      };
    }
    if (
      validationResult.operationType === OTPOperationTypes.VALIDATE_SIGNUP_OTP
    ) {
      return {
        token: null,
        refreshToken: null,
        status: singleSignOnStatusName.SUCCESS_NO_USER_RECORD_FOUND,
      };
    }
    const authCustomer = await this.context.authCustomer.getActiveByPhoneNumber(
      phoneNumber
    );
    const tokens = await this.generateToken(authCustomer);
    publishEvent(Topic.ANALYTICS_EVENTS,
      {
        eventType: customerAnalyticsEvents.OTP_REQUEST,
        customerId: authCustomer.customerId
      },
      this.context
    ).catch(err => console.error(err));
    return {
      ...tokens,
      status: singleSignOnStatusName.SUCCESS_EXISTING_USER,
    };
  }

  async checkStatus(phoneNumber) {
    let finalStatus = true;
    try {
      await this.setIdentityStats(phoneNumber);
      const [
        isExistCustomer,
        isExistOTPValidation,
        isUntrustedByAdjust,
        isExceededLimitForDifferentPhoneNumber,
        isPhoneNumberInActiveCountry,
        isSMSEnabledForRequestedCountry,
        isComingFromSharedService,
        isComingFromKnownSource,
      ] = await this.statusIdentity(phoneNumber);

      if (isSMSEnabledForRequestedCountry === true) {
        if (isExistCustomer === true || isComingFromSharedService === true) {
          await this.deleteIdentityBlock();
          finalStatus = true;
        } else {
          if (isExistOTPValidation === true) {
            await this.deleteIdentityBlock();
            finalStatus = true;
          } else {
            if (isComingFromKnownSource === true) {
              if (isUntrustedByAdjust === false) {
                if (isExceededLimitForDifferentPhoneNumber === true) {
                  finalStatus = false;
                } else {
                  if (isPhoneNumberInActiveCountry === false) {
                    finalStatus = false;
                  } else {
                    finalStatus = true;
                  }
                }
              } else {
                finalStatus = false;
              }
            } else {
              finalStatus = false;
            }
          }
        }
      } else {
        finalStatus = false;
      }

      const logPayload = {
        uniqueKey: this.getUniqueKeyInformation(),
        phoneNumber,
        isSMSEnabledForRequestedCountry,
        isExistCustomer,
        isExistOTPValidation,
        isUntrustedByAdjust,
        isExceededLimitForDifferentPhoneNumber,
        isPhoneNumberInActiveCountry,
        isComingFromSharedService,
        isComingFromKnownSource,
        finalStatus,
      };
      this.context.kinesisLogger
        .sendLogEvent(logPayload, 'customerRequestOTP-CheckStatus')
        .catch(r => console.log(r));
      if (!finalStatus) {
        SlackWebHookManager
          .sendTextToSlack(
            `[!!!OTP-SMS-REJECTED!!!] ${JSON.stringify(logPayload)}`
            , config.otpBlock.slackUrl,
          )
          .catch(r => console.log(r));
      }
    } catch (error) {
      // if we can not handle all condition, go on no block
      finalStatus = true;

      this.context.kinesisLogger.sendLogEvent({
        uniqueKey: this.getUniqueKeyInformation(),
        phoneNumber,
        finalStatus,
        error: error.message,
        stack: JSON.stringify(error.stack || {}),
      }, 'customerRequestOTP-CheckStatus-Error').catch(r => console.log(r));
    }

    return finalStatus;
  }

  async setIdentityStats(phoneNumber) {
    const identity = this.getUniqueKeyInformation();
    if (identity) {
      const cleanPhoneNumber = phoneNumber.trim();
      const { redis } = this.context;
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
        this.context.kinesisLogger.sendLogEvent({
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

  async statusIdentity(phoneNumber) {
    return Promise.all([
      this.isExistCustomer(phoneNumber),
      this.isExistOTPValidation(phoneNumber),
      this.isUntrustedByAdjust(phoneNumber),
      this.isExceededLimitForDifferentPhoneNumber(),
      this.isPhoneNumberInActiveCountry(phoneNumber),
      this.isSMSEnabledForRequestedCountry(phoneNumber),
      this.isComingFromSharedService(),
      this.isComingFromKnownSource(),
    ]);
  }

  async deleteIdentityBlock() {
    const { redis } = this.context;
    const identity = this.getUniqueKeyInformation();
    const key = this.getRedisBlockKey(identity);
    await redis.del(key);
  }

  getRedisBlockKey(identity) {
    return `otp:blocked:${identity}`;
  }

  getRedisListedKey(identity) {
    return `otp:requestedList:${identity}`;
  }

  getUniqueKeyInformation() {
    const {
      ip,
      deviceId,
      clientVer,
      clientOs,
      clientUserAgent,
    } = this.getDeviceInformation();
    if (deviceId) {
      return deviceId;
    } else {
      const identityKey = `${ip}_${clientOs || 'unk'}_${clientVer || 'unk'}_${clientUserAgent || 'unk'}`;
      return identityKey.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    }
  }

  getDeviceInformation() {
    const req = this.context.req;
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
    return {
      ip,
      deviceId,
      deviceIdentifierType,
      clientVer,
      clientOs,
      clientUserAgent,
    };
  }

  async isExistCustomer(phoneNumber) {
    const customer = await this.context.authCustomer.getActiveByPhoneNumber(
      phoneNumber,
    );
    return customer != null;
  }

  async isExistOTPValidation(phoneNumber) {
    const stats = await this.context.db
      .raw(`select (case
                      when oal.operation_type = 'REQUEST_LOGIN_OTP' then 'req'
                      when oal.operation_type = 'REQUEST_LOGIN_OTP_VOICE'
                        then 'req'
                      when oal.operation_type = 'REQUEST_SIGNUP_OTP' then 'req'
                      when oal.operation_type = 'REQUEST_SIGNUP_OTP_VOICE'
                        then 'req'
                      when oal.operation_type = 'VALIDATE_LOGIN_OTP' then 'val'
                      when oal.operation_type = 'VALIDATE_SIGNUP_OTP' then 'val'
                      when oal.operation_type = 'VALIDATION_FAIL' then 'val'
        end) opname,
                   count(*)
            from public.otp_activity_logs oal
            where oal.identifier = ?
              and oal.operation_type in (
                                         'REQUEST_LOGIN_OTP',
                                         'REQUEST_LOGIN_OTP_VOICE',
                                         'REQUEST_SIGNUP_OTP',
                                         'REQUEST_SIGNUP_OTP_VOICE',
                                         'VALIDATE_LOGIN_OTP',
                                         'VALIDATE_SIGNUP_OTP',
                                         'VALIDATION_FAIL'
              )
            group by opname`, [phoneNumber]);

    const reqCount = stats.rows.find(x => x.opname === 'req')?.count || 0;
    const valCount = stats.rows.find(x => x.opname === 'val')?.count || 0;

    if (reqCount != null && valCount != null) {
      return valCount > 0 ? true : null;
    } else {
      return null;
    }
  }

  async isPhoneNumberInActiveCountry(phoneNumber) {
    return true; // BYPASSED
    // const parsedPhoneNumber = parsePhoneNumber(phoneNumber);
    // const countryIsoCode = parsedPhoneNumber.country;
    // const country = await this.context.country.getActiveByIsoCode(
    //   countryIsoCode,
    // );
    // return country != null;
  }

  async isUntrustedByAdjust(phoneNumber) {
    const isAdjustDeviceCheckerEnabled = await this.isAdjustDeviceCheckerEnabledForRequestedCountry(phoneNumber);
    if (isAdjustDeviceCheckerEnabled) {
      const { isExistDeviceId, isUntrustedByAdjust, isExistDeviceByAdjust } = await this.isValidAdid(phoneNumber);
      if (isExistDeviceId === false) {
        return true;
      }
      if (isExistDeviceByAdjust === false) {
        return true;
      }
      if (isUntrustedByAdjust === true) {
        return true;
      }
      return false;
    } else {
      return false;
    }
  }

  async isExceededLimitForDifferentPhoneNumber() {
    const uniqueKey = this.getUniqueKeyInformation();
    const res = await this.isIdentityBlocked(uniqueKey);
    return res;
  }

  async isSMSEnabledForRequestedCountry(phoneNumber) {
    const parsedPhoneNumber = parsePhoneNumber(phoneNumber);
    const countryIsoCode = parsedPhoneNumber.country;
    const res = await this.context.sqlCache(this.context.otpAvailableCountries.getByIsoCode(countryIsoCode));
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

  async isValidAdid(phoneNumber) {
    const { deviceId } = this.getDeviceInformation();
    const result = {
      isExistDeviceId: !!deviceId,
      isUntrustedByAdjust: null,
      isExistDeviceByAdjust: null,
    };

    let message = '';
    try {
      if (deviceId) {
        const cfg = {
          url: config.adjust.urlForInspectDevice,
          timeout: 5000,
          method: 'GET',
          headers: {
            authorization: `Bearer ${config.adjust.apiToken}`,
          },
          params: {
            advertising_id: deviceId,
            app_token: config.adjust.appToken,
            format: 'json',
          },
        };
        const response = await Axios(cfg);
        // If Response 200
        message = response?.data;
        if (message
          && message.TrackerName
          && message?.TrackerName?.includes('Untrusted Devices')) {
          result.isUntrustedByAdjust = true;
          result.isExistDeviceByAdjust = true;
        } else {
          result.isUntrustedByAdjust = false;
          result.isExistDeviceByAdjust = true;
        }
      } else {
        // no device id
      }
    } catch (error) {
      message = error?.response?.data;
      if (message) {
        if (message?.includes('error: adid not found')) {
          result.isExistDeviceByAdjust = false;
        }
        if (message?.includes('error: device not found')) {
          result.isExistDeviceByAdjust = false;
        }
      }
    }
    this.context.kinesisLogger.sendLogEvent(
      { phoneNumber, message, result },
      'customerRequestOTP-AdId-Inspect',
    ).then(r => console.log(r));
    return result;
  }

  async isIdentityBlocked(identity) {
    const { redis } = this.context;
    const key = this.getRedisBlockKey(identity);
    const val = await redis.get(key);
    if (val) {
      return true;
    }
    return false;
  }

  async isComingFromSharedService() {
    const req = this.context.req;
    if (!req || !req.headers)
      return false;

    const sharedApiKeys = config.sharedApiKeys;
    const xApiKey = req.headers['x-api-key'] || req.headers['X-API-KEY'];
    if (xApiKey) {
      const res = sharedApiKeys.find(t => t.key === xApiKey);
      if (res) {
        // TODO: Need to handle by coming provider ex: alexa
        this.context.kinesisLogger.sendLogEvent({
          service: res.service,
          uniqueKey: this.getUniqueKeyInformation()
        }, 'customerRequestOTP-isComingFromSharedService').catch(r => console.log(r));
        return true;
      }
    }
    return false;
  }

  async isComingFromKnownSource() {
    const { clientOs } = this.getDeviceInformation();
    if (clientOs && ['android', 'ios'].includes(clientOs)) {
      return true;
    }
    return false;
  }

  async firstTimeUsersOTPList() {
    const OTPRecords = await OTPService.getAllOTPRecords();
    if (OTPRecords.length === 0) return [];
    const authCustomers = await this.context.authCustomer
      .selectFields(['phone_number'])
      .whereIn('phone_number', OTPRecords.map(item => item.identifier));
    const registeredPhoneNumbers = authCustomers.map(
      customer => customer.phoneNumber
    );
    return OTPRecords.filter(
      ({ identifier }) => !registeredPhoneNumbers.includes(identifier)
    );
  }

  async generateTokenForExpressDeliveryRider(driverId, orderSetId) {
    const payload = {
      driverId,
      orderSetId,
    };

    const accessTokenExpireTime = Number(config.expressDelivery.jwt.accessTokenExpire);
    const secret = Buffer.from(config.expressDelivery.jwt.secret, 'base64');
    const tokenVal = jwt.sign(payload, secret, {
      expiresIn: accessTokenExpireTime,
      algorithm: 'HS512',
      issuer: 'DRIVER_AUTH_SERVICE',
      jwtid: driverId,
      header: { typ: undefined },
    });

    return {
      token: {
        accessToken: tokenVal,
        expiresIn: accessTokenExpireTime,
        tokenType: 'Bearer',
      },
    };
  }

  async otpProcess({ phoneNumber, isAdmin, cancelAccountDeletion, providerPriority = providerPrioties.PRIMARY }) {
    // CANCEL ACCOUNT DELETION
    const resCancelAccountDeletion = await this.context.customerAccountDeletionRequest
      .otpRequestToCancelAccountDeletion({ phoneNumber, cancelAccountDeletion });
    if (resCancelAccountDeletion) {
      return resCancelAccountDeletion;
    }

    // OTP PROCESSES
    const res = await this.checkStatus(phoneNumber);
    if (res) {
      return this.requestSMSOTP(phoneNumber, isAdmin, providerPriority);
    } else {
      return {
        status: true,
      };
    }
  }

  async otpInformationByPhone({ phoneNumber }) {
    const providerInfos = [];
    const defaultProviderInfo = {
      priorityType: providerPrioties.PRIMARY,
      label: {
        en: 'Resend code via SMS',
        ar: 'إعادة إرسال الرمز عبر الرسائل النصية',
        tr: 'SMS ile yeniden kod gönder',
      },
      icon: null,
    };
    providerInfos.push(defaultProviderInfo);
    try {
      const phoneNumberInfo = parsePhoneNumber(phoneNumber);
      if (phoneNumberInfo) {
        const res = await this.context.db(this.context.otpAvailableCountries.tableName)
          .where('iso_code', phoneNumberInfo.country)
          .andWhere('is_sms_enabled', true)
          .first();
        if (res) {
          const { otpProviderSecondary } = res;
          if (otpProviderSecondary) {
            let info;
            switch (otpProviderSecondary) {
              case OTPProviders.UNIFONIC_WHATSAPP:
                info = {
                  priorityType: providerPrioties.SECONDARY,
                  label: {
                    en: 'Resend code via Whatsapp',
                    ar: 'إعادة إرسال الرمز عبر الواتساب',
                    tr: 'Whatsapp ile yeniden kod gönder',
                  },
                  icon: 'https://s3.eu-west-1.amazonaws.com/content.cofeadmin.com/media/shared/logos_whatsapp.png',
                };
                break;
              default:
                info = {
                  priorityType: providerPrioties.SECONDARY,
                  label: {
                    en: 'Resend code via SMS (Alternative)',
                    ar: 'إعادة إرسال الرمز عبر الرسائل النصية (بديلة)',
                    tr: 'SMS ile yeniden kod gönder (Alternatif)',
                  },
                  icon: null,
                };
                break;
            }
            providerInfos.push(info);
          }
        }
      }
    } catch (err) {
      console.log('otpInformationByPhone-error', err);
    }
    return providerInfos && providerInfos.length > 0
      ? providerInfos
      : null;
  }

  async isAdjustDeviceCheckerEnabledForRequestedCountry(phoneNumber) {
    const parsedPhoneNumber = parsePhoneNumber(phoneNumber);
    const countryIsoCode = parsedPhoneNumber.country;
    const res = await this.context.sqlCache(this.context.otpAvailableCountries.getByIsoCode(countryIsoCode));
    if (res) {
      if (res.isAdjustDeviceCheckerEnabled != null) {
        return res.isAdjustDeviceCheckerEnabled;
      } else {
        return true;
      }
    } else {
      return false;
    }
  }
}

module.exports = InternalAuthService;
