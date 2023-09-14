const { otp, env } = require('../../../config');
const DynamoDB = require('../../lib/aws-dynamodb');
const parsePhoneNumber = require('libphonenumber-js');
const { otpRequestError } = require('../root/enums');
const { OTPProviders, OTPTypes, OTPOperationTypes, providerPrioties } = require('./enums');
const Karix = require('./otp-providers/Karix');
const Unifonic = require('./otp-providers/Unifonic');
const Cequens = require('./otp-providers/Cequens');
const VictoryLink = require('./otp-providers/VictoryLink');
const UnifonicWhatsapp = require('./otp-providers/UnifonicWhatsapp');
const MockProvider = require('./otp-providers/MockProvider');
const knex = require('../../../database');
const {
  OTPServiceValidationError,
  OTPProviderValidationError,
  OTPProviderError,
} = require('./errors');
const { uuid } = require('../../lib/util');
const { camelCase, transform, isArray, isObject } = require('lodash');

class OTPService {
  constructor(
    {
      phoneNumber,
      providerPriority,
      options = {},
    },
  ) {
    this.db = knex;
    this.phoneNumber = phoneNumber ? parsePhoneNumber(phoneNumber) : null;
    this.providerPriority = providerPriority || providerPrioties.PRIMARY;
    this.options = {
      ignoreRateLimit: false,
      forceToUseMockProvider: false,
      ...options,
    };
    this._OTPCountry = null;
    this._customer = null;
  }

  async setPhoneNumberIfNullByCustomIdentifier(customIdentifier) {
    if (!this.phoneNumber && customIdentifier) {
      const phoneNumber = await this.getPhoneNumberByCustomIdentifier(customIdentifier);
      this.phoneNumber = phoneNumber ? parsePhoneNumber(phoneNumber) : null;
    }
  }

  async validate() {
    // google validation
    if (!this.phoneNumber.isValid()) {
      throw new OTPServiceValidationError(otpRequestError.INVALID_PHONE_NUMBER);
    }
    // otp_available_countries check with dial code
    const OTPCountry = await this.getOTPCountry();
    if (!OTPCountry) {
      throw new OTPServiceValidationError(
        otpRequestError.COUNTRY_IS_NOT_AVAILABLE,
      );
    } else {
      const { otpProvider, otpProviderSecondary } = OTPCountry;
      if (this.providerPriority === providerPrioties.PRIMARY && !otpProvider) {
        throw new OTPServiceValidationError(
          otpRequestError.INVALID_OTP_PROVIDER,
        );
      }
      if (this.providerPriority === providerPrioties.SECONDARY && !otpProviderSecondary) {
        throw new OTPServiceValidationError(
          otpRequestError.INVALID_SECONDARY_OTP_PROVIDER,
        );
      }
    }
    // rate limit check from dynamodb if request is not coming from portal
    if (otp.isOTPRateLimitActive && !this.options.ignoreRateLimit) {
      const isRateLimitExceeded = await this.isRateLimitExceeded();
      if (isRateLimitExceeded) {
        throw new OTPServiceValidationError(
          otpRequestError.RATE_LIMIT_EXCEEDED,
        );
      }
    }

    const customer = await this.getCustomer();
    if (customer?.isDisabled) {
      throw new OTPServiceValidationError(
        otpRequestError.DISABLED_CUSTOMER,
      );
    }

    return true;
  }

  async validateOTP(OTPCode) {
    try {
      await this.validate();
      const recordedOTP = await this.getOTPCodeFromDB();
      const provider = await this.getOTPProvider();
      const bypassCode = await this.getOTPBypassCodeFromDB();
      let operationType;
      let status = true;
      if (recordedOTP?.otpCode === OTPCode || (bypassCode && bypassCode?.otpCode === OTPCode)) {
        operationType = await this.getOperationType({isValidation: true});
      } else {
        operationType = OTPOperationTypes.VALIDATION_FAIL;
        status = false;
      }
      this.logOTPActivity({
        providerName: provider.name,
        providerResponse: null,
        OTPCode,
        operationType,
      });
      return {
        status,
        operationType
      };
    } catch (err) {
      let error = otpRequestError.SERVICE_ERROR;
      if (err instanceof OTPServiceValidationError) {
        error = err.message;
      }
      return {
        status: false,
        operationType: OTPOperationTypes.VALIDATION_FAIL,
        error,
      };
    }
  }

  async isRateLimitExceeded() {
    let recorderOTPHit = await DynamoDB.getItem({
      tableName: otp.OTPHitTableName,
      dynamoDBQuery: { identifier: { S: this.phoneNumber.number } },
    });

    if (!recorderOTPHit) {
      recorderOTPHit = { hit: 0 };
    }

    recorderOTPHit.hit = Number(recorderOTPHit.hit);

    await DynamoDB.putItem({
      tableName: otp.OTPHitTableName,
      item: {
        ttl: {
          N: String(
            recorderOTPHit.ttl
            || Math.floor(Date.now() / 1000) + otp.OTPHitValidityInSeconds,
          ),
        },
        hit: { N: String(recorderOTPHit.hit + 1) },
        identifier: { S: this.phoneNumber.number },
      },
    });

    return recorderOTPHit.hit >= otp.OTPRateLimit;
  }

  async getOTPCountry() {
    if (!this._OTPCountry) {
      this._OTPCountry = await this.db('otp_available_countries')
        .where('iso_code', this.phoneNumber.country)
        .andWhere('is_sms_enabled', true)
        .first();
    }
    return this._OTPCountry;
  }

  async getOTPProvider() {
    if (this.isMockEnabled() || this.options.forceToUseMockProvider) {
      return new MockProvider(this.phoneNumber);
    }
    const OTPCountry = await this.getOTPCountry();
    let otpProvider = OTPCountry.otpProvider;
    switch (this.providerPriority) {
      case providerPrioties.PRIMARY:
        otpProvider = OTPCountry.otpProvider;
        break;
      case providerPrioties.SECONDARY:
        if (OTPCountry.otpProviderSecondary) {
          otpProvider = OTPCountry.otpProviderSecondary;
        }
        break;
    }
    switch (otpProvider) {
      case OTPProviders.KARIX:
        return new Karix(this.phoneNumber);
      case OTPProviders.UNIFONIC:
        return new Unifonic(this.phoneNumber);
      case OTPProviders.CEQUENS:
        return new Cequens(this.phoneNumber);
      case OTPProviders.UNIFONIC_WHATSAPP:
        return new UnifonicWhatsapp(this.phoneNumber);
      case OTPProviders.VICTORY_LINK:
        return new VictoryLink(this.phoneNumber);
      default:
        return new Karix(this.phoneNumber);
    }
  }

  isMockEnabled() {
    return (otp.mockDisabledPhoneNumbers ?? []).includes(this.phoneNumber.number)
      ? false
      : (otp.mockEnabledEnvironments.includes(env) || otp.mockEnabledPhoneNumbers.includes(this.phoneNumber.number));
  }

  async sendOTP(OTPType = OTPTypes.SMS) {
    // if (env !== 'production') return { status: true };
    try {
      await this.validate();
      const provider = await this.getOTPProvider();
      await provider.validate();
      const OTPCode = await this.createOTPCode(provider.name);
      let providerResponse;
      switch (OTPType) {
        case OTPTypes.SMS:
          providerResponse = await provider.sendSMSOTP(OTPCode);
          break;
        default:
          throw new OTPServiceValidationError(
            otpRequestError.INVALID_OTP_METHOD
          );
      }
      const operationType = await this.getOperationType({ OTPType });
      this.logOTPActivity({
        providerName: provider.name,
        providerResponse,
        OTPCode,
        operationType,
      });
      return { status: true };
    } catch (err) {
      // process error ex: otpErrorResponse
      let error;
      let errorBody;
      if (err instanceof OTPServiceValidationError) {
        console.log(err.message);
        error = err.message;
        if (err.message === otpRequestError.RATE_LIMIT_EXCEEDED) {
          const seconds = Number(otp.OTPHitValidityInSeconds);
          const mins = seconds > 0 ? seconds / 60 : -1;
          const hours = mins > 0 ? mins / 60 : -1;
          const maxAttemptVal = Number(otp.OTPRateLimit);
          errorBody = {
            lockDurationInSeconds: seconds,
            lockDurationInMins: Math.floor(mins),
            lockDurationInHours: Math.floor(hours),
            maxAttempt: maxAttemptVal,
          };
        }
      } else if (err instanceof OTPProviderValidationError) {
        console.log(err.message);
        error = err.message;
      } else if (err instanceof OTPProviderError) {
        error = otpRequestError.SERVICE_ERROR;
      } else {
        error = otpRequestError.SERVICE_ERROR;
      }
      return {
        status: false,
        error,
        errorBody,
        rawError: err,
      };
    }
  }

  async logOTPActivity(
    { providerName, providerResponse, OTPCode, operationType }
  ) {
    await this.db('otp_activity_logs').insert({
      id: uuid.get(),
      providerType: providerName,
      identifier: this.phoneNumber.number,
      otpCode: OTPCode,
      providerResponse,
      operationType,
      customIdentifier: OTPService.getCustomIdentifierIfExist(providerName, providerResponse)
    });
  }

  async getCustomer() {
    if (!this._customer) {
      const customers = await this.db('auth_customer')
        .where('phone_number', this.phoneNumber.number)
        .orderBy('created', 'desc');
      if (customers.length === 1) {
        this._customer = customers[0];
      } else if (customers.length > 1) {
        const activeCustomers = customers.filter(
          customer => customer.isDisabled === false
        );
        if (activeCustomers.length > 1) {
          throw new OTPServiceValidationError(
            otpRequestError.DUPLICATE_CUSTOMER_EXIST,
          );
        } else if (activeCustomers.length === 1) {
          this._customer = activeCustomers[0];
        } else {
          this._customer = customers[0];
        }
      }
    }
    return this._customer;
  }

  async getOperationType({ OTPType, isValidation = false }) {
    const customer = await this.getCustomer();
    if (isValidation) {
      if (!customer) {
        return OTPOperationTypes.VALIDATE_SIGNUP_OTP;
      } else {
        return OTPOperationTypes.VALIDATE_LOGIN_OTP;
      }
    }
    if (OTPType === OTPTypes.SMS) {
      if (!customer) {
        return OTPOperationTypes.REQUEST_SIGNUP_OTP;
      } else {
        return OTPOperationTypes.REQUEST_LOGIN_OTP;
      }
    } else if (OTPType === OTPTypes.VOICE) {
      if (!customer) {
        return OTPOperationTypes.REQUEST_SIGNUP_OTP_VOICE;
      } else {
        return OTPOperationTypes.REQUEST_LOGIN_OTP_VOICE;
      }
    }
  }

  getOTPCodeFromDB() {
    return DynamoDB.getItem({
      tableName: otp.OTPCodeTableName,
      dynamoDBQuery: { identifier: { S: this.phoneNumber.number } },
    });
  }

  getOTPBypassCodeFromDB() {
    return DynamoDB.getItem({
      tableName: otp.OTPCodeTableName,
      dynamoDBQuery: { identifier: { S: 'bypassCode' } },
    });
  }

  saveOTPCodeToDB(OTPCode, providerName) {
    return DynamoDB.putItem({
      tableName: otp.OTPCodeTableName,
      item: {
        ttl: {
          N: String(
            Math.floor(Date.now() / 1000) + otp.OTPValidityInSeconds,
          ),
        },
        otpCode: { S: String(OTPCode) },
        identifier: { S: this.phoneNumber.number },
        type: { S: providerName },
      },
    });
  }

  resetOTPRateLimit() {
    return DynamoDB.deleteItem({
      tableName: otp.OTPHitTableName,
      dynamoDBQuery: { identifier: { S: this.phoneNumber.number } },
    });
  }
  async createOTPCode(providerName) {
    // unifonic does not send same code twice that's why
    // we created new OTPCode in every request
    // const recorderOTP = await this.getOTPCodeFromDB();
    // if (recorderOTP?.otpCode) return recorderOTP.otpCode;

    const OTPCode = this.isMockEnabled()
      ? otp.mockOTP
      // max: 999999 min: 100000
      // Math.floor(Math.random() * (max - min + 1)) + min
      : Math.floor(Math.random() * 900000) + 100000;

    await this.saveOTPCodeToDB(OTPCode, providerName);
    return OTPCode;
  }

  static getAllOTPRecords() {
    return DynamoDB.scan({
      TableName: otp.OTPCodeTableName,
      ReturnConsumedCapacity: 'TOTAL',
    });
  }

  static getCustomIdentifierIfExist(providerName, providerResponse) {
    const contentBody = this.camelize(providerResponse);
    switch (providerName) {
      case OTPProviders.KARIX:
        return null;
      case OTPProviders.UNIFONIC:
        return contentBody?.body?.messageId // from callback
          || contentBody?.data?.messageId // from request
          || null;
      case OTPProviders.CEQUENS:
        return contentBody?.msgid // from callback
          || contentBody?.data?.sentSmsiDs[0]?.smsId // from request
          || null;
      case OTPProviders.VICTORY_LINK:
        return contentBody?.userSmsId // from callback
          || contentBody?.smsid // from request
          || null;
      case OTPProviders.UNIFONIC_WHATSAPP:
        return contentBody?.messageId // from callback / request
          || null;
      default:
        return null;
    }
  }

  async getPhoneNumberByCustomIdentifier(customerIdentifier) {
    const { identifier } = await this.db('otp_activity_logs')
      .where('custom_identifier', customerIdentifier)
      .whereNotNull('identifier')
      .first();
    return identifier;
  }

  static camelize(obj) {
    return transform(obj, (acc, value, key, target) => {
      const camelKey = isArray(target) ? key : camelCase(key);
      acc[camelKey] = isObject(value) ? this.camelize(value) : value;
    });
  }
}

module.exports = OTPService;
