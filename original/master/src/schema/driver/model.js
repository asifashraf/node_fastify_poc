/* eslint-disable camelcase */
const BaseModel = require('../../base-model');
const { uuid, rtlAndLtrTextConversion } = require('../../lib/util');
const { map, find, filter, uniq, omit } = require('lodash');
const { DriverSaveError, DriverBranchSaveError, DriverDeleteError } = require('./enums');
const { orderFulfillmentTypes } = require('../order-set/enums');
const { countryConfigurationKeys, redirectionCodes } = require('../root/enums');
const moment = require('moment');
const UnifonicSMS = require('../auth/sms-providers/Unifonic');
const { smsOperationType, OTPProviders } = require('../auth/enums');
const SlackWebHookManager = require('../slack-webhook-manager/slack-webhook-manager');
const parsePhoneNumber = require('libphonenumber-js');
const KarixSMS = require('../auth/sms-providers/Karix');
const CequensSMS = require('../auth/sms-providers/Cequens');
const { orderPaymentMethods } = require('../root/enums');
const { basePath, smsAlertSlackUrl } = require('../../../config');
const { addPaging } = require('../../lib/util');
const { v4 } = require('is-uuid');
const {
  calculateDriverTokenKey,
  saveDriverTokenKey,
} = require('./redis-helper');
const { getShortUrl } = require('../../lib/url-shortener');
const VictoryLinkSMS = require('../auth/sms-providers/VictoryLink');

class Driver extends BaseModel {
  constructor(db, context) {
    super(db, 'drivers', context);
  }

  async validateDriver(driver) {
    let errors = [];
    if (driver) {
      if (!driver.firstName || !driver.firstName.trim()) {
        errors.push(DriverSaveError.INVALID_FIRST_NAME);
      }
      if (!driver.lastName || !driver.lastName.trim()) {
        errors.push(DriverSaveError.INVALID_LAST_NAME);
      }
      if (!driver.phoneNumber || !driver.phoneNumber.trim()) {
        errors.push(DriverSaveError.INVALID_PHONE_NUMBER);
      }
      if (driver.phoneNumber) {
        const phone = parsePhoneNumber(driver.phoneNumber);
        if (!phone || !phone.isValid()) {
          errors.push(DriverSaveError.INVALID_PHONE_NUMBER);
        }
        /*if (driver.phoneCountry && phone && phone.country != driver.phoneCountry) {
          errors.push(DriverSaveError.INVALID_PHONE_COUNTRY);
        }*/
        const driverDb = await this.db(this.tableName)
          .where('phone_number', driver.phoneNumber)
          .first();
        if (driverDb) {
          if (driver.id && driver.id !== driverDb.id) {
            errors.push(DriverSaveError.DRIVER_ALREADY_EXIST);
          }
          if (!driver.id) {
            errors.push(DriverSaveError.DRIVER_ALREADY_EXIST);
          }
        }
      }
    } else {
      errors.push(DriverSaveError.INVALID_INPUT);
    }
    errors = uniq(errors);
    return errors;
  }

  async saveDriver(driver) {
    const phone = parsePhoneNumber(driver.phoneNumber);
    if (driver.id) {
      const driverDb = await this.getById(driver.id);
      if (!driverDb) {
        await this.db(this.tableName).insert({
          id: driver.id,
          first_name: driver.firstName,
          last_name: driver.lastName,
          phone_number: driver.phoneNumber,
          phone_country: phone.country
        });
        return driver.id;
      }
    }
    return this.context.driver.save({ ...driver, phoneCountry: phone.country });
  }

  getById(id) {
    return this.db(this.tableName)
      .where('id', id)
      .first();
  }

  async validateDriverBranch(input) {
    const errors = [];
    if (input) {
      if (!input.driverId) {
        errors.push(DriverBranchSaveError.INVALID_DRIVER);
      } else {
        const driver = this.context.driver.getById(input.driverId);
        if (!driver) {
          errors.push(DriverBranchSaveError.INVALID_DRIVER);
        }
      }
      if (input.branchIds.length === 0) {
        errors.push(DriverBranchSaveError.INVALID_BRANCH);
      } else {
        const branches = await Promise.all(map(input.branchIds, async branchId => await this.context.brandLocation.getById(branchId)));
        if (branches.length !== input.branchIds.length) {
          errors.push(DriverBranchSaveError.INVALID_BRANCH);
        }
        const driverBranches = await this.getAllDriverBranchsFromDb(input.driverId, input.branchIds);
        if (driverBranches.length !== 0) {
          errors.push(DriverBranchSaveError.BRANCH_ALREADY_EXIST);
        }
      }
    } else {
      errors.push(DriverBranchSaveError.INVALID_INPUT);
    }
    return errors;
  }

  getAllDriverBranchsFromDb(driverId, branchIds) {
    return this.db('drivers_branches')
      .where('driver_id', driverId)
      .whereIn('branch_id', branchIds);
  }

  async validateDeleteDriverBranch(input) {
    const errors = [];
    if (input) {
      if (!input.driverId) {
        errors.push(DriverBranchSaveError.INVALID_DRIVER);
      }
      if (input.branchIds.length === 0) {
        errors.push(DriverBranchSaveError.INVALID_BRANCH);
      }
      const branches = await this.getAllDriverBranchsFromDb(input.driverId, input.branchIds);
      if (branches.length !== input.branchIds.length) {
        errors.push(DriverBranchSaveError.INVALID_BRANCH);
      }
    } else {
      errors.push(DriverBranchSaveError.INVALID_INPUT);
    }
    return errors;
  }

  async saveBranchesToDriver(input) {
    const branches = await this.getAllDriverBranchsFromDb(input.driverId, input.branchIds);
    await Promise.all(map(input.branchIds, branchId => {
      const isExists = find(branches, branch => branch.branchId === branchId);
      if (!isExists) {
        return this.db('drivers_branches').insert({
          id: uuid.get(),
          driver_id: input.driverId,
          branch_id: branchId
        });
      }
    }));
  }

  async getBranchesByDriverId(driverId) {
    const branches = await this.db('drivers_branches')
      .where('driver_id', driverId);
    const branchIds = map(branches, branch => branch.branchId);
    return branchIds;
  }

  async deleteBranchFromDriver(input) {
    const branches = await this.getAllDriverBranchsFromDb(input.driverId, input.branchIds);
    await Promise.all(map(branches, branch => {
      return this.db('drivers_branches')
        .where('id', branch.id)
        .del();
    }));
    return true;
  }

  getText(lang, key) {
    const tl = {
      customerInformation: {
        en: 'Customer Information',
        ar: 'معلومات العميل',
      },
      orderCode: {
        en: 'Order Code',
        ar: 'رمز الطلب',
      },
      brandBranch: {
        en: 'Brand/Branch',
        ar: 'العلامة التجارية/الفرع',
      },
      address: {
        en: 'Address',
        ar: 'العنوان',
      },
      paymentMethod: {
        en: 'Payment Method',
        ar: 'طريقة الدفع',
      },
      car: {
        en: 'Car',
        ar: 'السيارة',
      },
      etaToTheCustomer: {
        en: 'ETA to the customer',
        ar: 'الوقت المتوقع للوصول للعميل',
      },
      mins: {
        en: 'mins',
        ar: 'دقائق',
      },
      queueNumber: {
        en: 'Queue Number',
        ar: 'رقم قائمة الانتظار'
      },
      brandBranchName: {
        en: 'Brand / Branch',
        ar: 'اسم المقهى / الفرع'
      },
      proceedSentence: {
        en: 'Click this link to proceed',
        ar: 'اضغط على الرابط للمتابعة'
      }
    };
    return rtlAndLtrTextConversion(lang, tl[key][lang]);
  }

  async getAddressDetails(lang, fulfillmentId) {
    const address = await this.context.customerAddress.getById(fulfillmentId);
    if (!address || address.extraFields.length === 0) return '';

    const nonEmptyAddressFields = filter(address.extraFields, field => field.value);
    const strFields = map(nonEmptyAddressFields, field => field.value);
    const addressText = strFields.join(', ') + ', ' + address.city;
    const googleMaps = `https://www.google.com/maps?q=${address.latitude},${address.longitude}`;
    const addressLine = `${addressText} / ${googleMaps}`;
    return `${this.getText(lang, 'address')}: ${rtlAndLtrTextConversion('en', addressLine)}`;
  }

  async getCarDetails(lang, orderFulfillment, paymentMethod) {
    const isCashPayment = paymentMethod === orderPaymentMethods.CASH;
    let carInfo = '';
    if (orderFulfillment.deliverToVehicle) {
      carInfo += orderFulfillment.vehicleDescription ? orderFulfillment.vehicleDescription + ' ' : '';
      carInfo += orderFulfillment.vehicleColor ? orderFulfillment.vehicleColor + ' ' : '';
      carInfo += orderFulfillment.vehiclePlateNumber ? orderFulfillment.vehiclePlateNumber : '';
    }

    if (isCashPayment) {
      return `${this.getText(lang, 'paymentMethod')}: ${rtlAndLtrTextConversion('en', paymentMethod)}
${this.getText(lang, 'car')}: ${rtlAndLtrTextConversion('en', carInfo)}`;
    } else {
      return `${this.getText(lang, 'car')}: ${rtlAndLtrTextConversion('en', carInfo)}`;
    }
  }

  async prepareSMSBody({ orderFulfillment, shortCode, countryId, branch, customer, paymentMethod, driverLanguage }) {
    const lang = driverLanguage === 'ar' ? 'ar' : 'en';
    const timeOffset = moment.tz(branch.timeZoneIdentifier).utcOffset();
    const brand = await this.context.brand.getById(branch.brandId);
    const now = moment();
    let eta;
    const customerLine = `${customer.firstName} ${customer.lastName} (${customer.phoneNumber})`;
    const brandName = {
      en: brand?.name?.en || brand?.name || '',
      ar: brand?.nameAr || brand?.name?.ar || brand?.name || '',
      tr: brand?.nameTr || brand?.name?.tr || brand?.name || '',
    };
    const branchName = {
      en: branch?.name?.en || branch?.name || '',
      ar: branch?.nameAr || branch?.name?.ar || branch?.name?.en || branch?.name || '',
      tr: branch?.nameTr || branch?.name?.tr || branch?.name?.en || branch?.name || '',
    };
    const brandBranchLine = `${brandName[lang]} / ${branchName[lang]}`;
    let body =
      `${rtlAndLtrTextConversion('en', orderFulfillment.type)}
${this.getText(lang, 'customerInformation')}: ${rtlAndLtrTextConversion('en', customerLine)}
${this.getText(lang, 'orderCode')}: ${rtlAndLtrTextConversion('en', shortCode)}
${this.getText(lang, 'brandBranchName')}: ${rtlAndLtrTextConversion('en', brandBranchLine)}`;

    const configKey = orderFulfillment.type === orderFulfillmentTypes.EXPRESS_DELIVERY
      ? countryConfigurationKeys.ESTIMATED_TIME_IN_MINS_EXPRESS_DELIVERY
      : countryConfigurationKeys.ESTIMATED_TIME_IN_MINS_CAR;

    const query = await this.context.countryConfiguration.getByKey(configKey, countryId);

    if (query) {
      eta = query.configurationValue;
    }

    if (orderFulfillment.type === orderFulfillmentTypes.EXPRESS_DELIVERY) {
      body += '\n' + await this.getAddressDetails(lang, orderFulfillment.fulfillmentId);
    } else if (orderFulfillment.type === orderFulfillmentTypes.CAR) {
      body += '\n' + await this.getCarDetails(lang, orderFulfillment, paymentMethod);
    }

    if (eta) {
      const estimatedTime = now
        .add(eta, 'minutes')
        .add(timeOffset, 'minutes')
        .toISOString();
      const estimatedTimeStr = estimatedTime.substring(0, 10) + ' ' + estimatedTime.substring(11, 16);
      body += `
${this.getText(lang, 'etaToTheCustomer')}: ${rtlAndLtrTextConversion('en', eta)} ${this.getText(lang, 'mins')}
${rtlAndLtrTextConversion('en', estimatedTimeStr)}`;
    }
    return body;
  }

  async prepareSMSBodyV2({ driverLanguage, token, brand, branch, order, orderQueue }) {
    const lang = driverLanguage;
    const brandName = {
      en: brand?.name?.en || brand?.name || '',
      ar: brand?.nameAr || brand?.name?.ar || brand?.name || '',
      tr: brand?.nameTr || brand?.name?.tr || brand?.name || '',
    };
    const branchName = {
      en: branch?.name?.en || branch?.name || '',
      ar: branch?.nameAr || branch?.name?.ar || branch?.name?.en || branch?.name || '',
      tr: branch?.nameTr || branch?.name?.tr || branch?.name?.en || branch?.name || '',
    };
    const brandBranchNameLine = `${brandName[driverLanguage]} / ${branchName[driverLanguage]}`;
    const baseUrl = new URL('go', basePath); // Magic String (Route)
    baseUrl.searchParams.set('c', redirectionCodes.EXPRESS_DELIVERY_TRACKING_PAGE_URL);
    baseUrl.searchParams.set('l', lang);
    baseUrl.searchParams.set('token', token);
    const riderUrl = baseUrl.toString();
    const { shortLink } = await getShortUrl(riderUrl);
    const finalUrl = shortLink || riderUrl;
    const lineList = [
      `${this.getText(lang, 'queueNumber')}: ${orderQueue}`,
      `${this.getText(lang, 'orderCode')}: ${order.shortCode}`,
      `${this.getText(lang, 'brandBranchName')}: ${brandBranchNameLine}`,
      `${this.getText(lang, 'proceedSentence')}: ${finalUrl}`,
    ];
    return lineList.join('\n');
  }

  async sendSMSToDriver(orderId) {
    const [orderFulfillment, orderSet, orderSetQueue] = await Promise.all([
      this.context.orderFulfillment.getByOrderSet(orderId),
      this.context.orderSet.getById(orderId),
      this.context.orderSet.getQueueById({ id: orderId }),
    ]);

    if (![orderFulfillmentTypes.CAR, orderFulfillmentTypes.EXPRESS_DELIVERY].includes(orderFulfillment.type)) {
      return null;
    }

    const [branch, driversInfo] = await Promise.all([
      this.context.brandLocation.getById(orderSet.brandLocationId),
      this.getDriversByBranchId(orderSet.brandLocationId),
    ]);
    const brand = await this.context.brand.getById(branch.brandId);
    if (driversInfo.length === 0) {
      // TODO: ADD some alert, branch has ED but there is no driver
      return null;
    }
    const sendSMSAndUpdate = async (driver, orderId, orderSet, orderSetQueue, brand, branch) => {
      const driverNumber = driver.phoneNumber;
      const driverPhoneCountry = driver.phoneCountry;
      const availableCountry = await this.getSMSProvider(driverPhoneCountry);
      if (!availableCountry) {
        return;
      }
      const smsService = this.setSMSService(driverNumber, availableCountry);
      try {
        const isValid = await smsService.validate();
        if (isValid) {
          const token = await this.context.internalAuthService.generateTokenForExpressDeliveryRider(driver.id, orderId);
          let body = '';

          switch (orderFulfillment.type) {
            case orderFulfillmentTypes.CAR:
              const [customer, country] = await Promise.all([
                this.context.customer.getById(orderSet.customerId),
                this.context.country.getByCurrencyId(orderSet.currencyId),
              ]);
              body = await this.prepareSMSBody({
                orderFulfillment,
                shortCode: orderSet.shortCode,
                countryId: country.id,
                branch,
                customer,
                paymentMethod: orderSet.paymentMethod,
                driverLanguage: (driver?.preferredLanguage || 'en'),
              });
              break;

            case orderFulfillmentTypes.EXPRESS_DELIVERY:
              body = await this.prepareSMSBodyV2({
                order: orderSet,
                orderQueue: orderSetQueue,
                brand,
                branch,
                token: token.token.accessToken,
                driverLanguage: (driver?.preferredLanguage || 'en'),
              });
              break;
          }

          if (body) {
            await smsService.sendSMS({ referenceId: orderId, body, operationType: smsOperationType.DRIVER });
            const targetKey = calculateDriverTokenKey(orderId, driver.id);
            await saveDriverTokenKey(targetKey, token);
            await SlackWebHookManager.sendTextAndObjectAndImage({
              text: '[!!!SMS_SERVICE_SUCCESS!!!]',
              object: {
                referenceId: orderId,
                operationType: smsOperationType.DRIVER,
                otpProvider: availableCountry.otpProvider,
                driverId: driver.id,
                driverPhone: driver.phoneNumber,
              },
              webhookUrl: smsAlertSlackUrl,
            });
          } else {
            await SlackWebHookManager.sendTextAndObjectAndImage({
              text: '[!!!SMS_SERVICE_FAIL!!!]',
              object: {
                referenceId: orderId,
                operationType: smsOperationType.DRIVER,
                driverId: driver.id,
                driverPhone: driver.phoneNumber,
                otpProvider: availableCountry.otpProvider,
              },
              webhookUrl: smsAlertSlackUrl,
            });
          }
        }
      } catch (error) {
        const { stack, message } = error || {};
        await this.logIt({ eventType: 'driver-sms-error', eventObject: { stack, message } });
        SlackWebHookManager.sendTextAndObjectAndImage({
          text: '[!!!SMS_SERVICE_FAIL!!!]',
          object: {
            referenceId: orderId,
            operationType: smsOperationType.DRIVER,
            driverId: driver.id,
            driverPhone: driver.phoneNumber,
            otpProvider: availableCountry.otpProvider,
            errorStack: stack,
            errorMessage: message
          },
          webhookUrl: smsAlertSlackUrl,
        });
      }
    };
    const promises = driversInfo.map(driver => sendSMSAndUpdate(driver, orderId, orderSet, orderSetQueue, brand, branch));
    await Promise.all(promises);
  }

  async getDriversByBranchId(branchId) {
    const drivers = await this.db('drivers_branches')
      .where('branch_id', branchId);
    if (drivers.length !== 0) {
      const driversInfo = Promise.all(map(drivers, async driver => await this.getById(driver.driverId)));
      return driversInfo;
    }
    return [];
  }

  async getSMSProvider(isoCode) {
    const country = await this.db('otp_available_countries')
      .where('iso_code', isoCode)
      .andWhere('is_sms_enabled', true)
      .first();
    if (country) {
      return country;
    }
    return null;
  }

  setSMSService(phoneNumber, country) {
    if (country.otpProvider === OTPProviders.KARIX) {
      return new KarixSMS(phoneNumber, country);
    }
    if (country.otpProvider === OTPProviders.UNIFONIC) {
      return new UnifonicSMS(phoneNumber, country);
    }
    if (country.otpProvider === OTPProviders.CEQUENS) {
      return new CequensSMS(phoneNumber, country);
    }
    if (country.otpProvider === OTPProviders.VICTORY_LINK) {
      return new VictoryLinkSMS(phoneNumber, country);
    }
  }

  async validateDeleteDriver(driverId) {
    const errors = [];
    if (!driverId) {
      errors.push(DriverDeleteError.INVALID_DRIVER);
    }
    if (!v4(driverId)) {
      errors.push(DriverDeleteError.INVALID_DRIVER);
    } else {
      const driver = await this.context.driver.getById(driverId);
      if (!driver) {
        errors.push(DriverDeleteError.INVALID_DRIVER);
      }
    }
    return errors;
  }

  async deleteDriver(input) {
    try {
      const { driverId } = input;
      const errors = await this.context.driver.validateDeleteDriver(driverId);
      if (errors.length > 0) {
        return { errors, deleted: false };
      }
      await this.db('drivers_branches').where('driver_id', driverId).delete();
      await this.context.driver.deleteById(driverId);
      return { errors: null, deleted: true };
    } catch (e) {
      return { errors: [DriverDeleteError.UNEXPECTED_ERROR], deleted: false };
    }
  }

  getQueryByFilters(filters, paging) {
    let query = this.db(this.tableName);
    if (filters.searchText) {
      filters.searchText = filters.searchText.toLowerCase().trim();
      query.whereRaw(
        '( LOWER(first_name) like ? or last_name like ? )'
        , [`%${filters.searchText}%`, `%${filters.searchText}%`],
      );
    }
    filters = omit(filters, ['searchText']);
    if (filters) {
      query = query.where(filters);
    }
    if (paging) {
      query = addPaging(query, paging);
    }
    return query;
  }

}


module.exports = Driver;
