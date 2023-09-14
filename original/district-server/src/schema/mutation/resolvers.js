// utilities
const {
  formatError,
  publishSubscriptionEvent,
  publishStoreOrderSubscriptionEvent,
  removeLocalizationField,
  removeLocalizationMultipleFields,
  addLocalizationField,
  addLocalizationMultipleFields,
  uuid,
  isNullOrUndefined,
} = require('../../lib/util');
const { map, assign, get, filter, omit, first, findIndex } = require('lodash');
const Promise = require('bluebird');
const { cateringRequestCreate } = require('../../lib/catering-requests');
const {
  brandLocationPriceRuleError,
  paymentProvider,
  paymentStatusName,
  orderPaymentMethods,
  orderSetSubscriptionEvent,
  customerStatus,
  orderSetSource,
  storeOrderSubscriptionEvent,
  storeOrderSetSubscriptionEvent,
  paymentStatusOrderType,
  singleSignOnStatusName,
  customerUpdateError,
  // scheduledNotificationEventTypes,
  orderSetStatusNames,
  loyaltyTransactionType,
  // otpRequestError,
  streams,
  streamActions,
  importBrandSubscriptionModelError,
  saveOrderRatingError,
  customerRegisterLiteError,
  OrderRatingStatus,
  OrderRatingQuestionType,
  statusTypes,
  brandLocationUnavailableMenuItemError,
  fulfillmentType, countryConfigurationKeys,
} = require('../root/enums');

const { notificationCategories } = require('../../lib/notifications');
const moment = require('moment');
const bcrypt = require('bcryptjs');
const saltRounds = 15;
// const { rewardSave } = require('../reward/mutations');
const { invalidateAllMenus } = require('../c-menu/utils');
const firebase = require('../../lib/firebase');
const { invalidateCountryCurrencyLookup } = require('../country/redis-helper');
const { notificationType } = require('../root/enums');
const {
  notificationsForStatusChange,
} = require('../order-set-status/notifications');
const { invalidateLoyaltyTiersCache } = require('../loyalty-tier/redis-helper');
const { publishVerifiedEmailToBraze } = require('../../lib/braze');
const {
  defaultUserPasswordHash, ecommerce,
} = require('../../../config');
const jwtDecode = require('jwt-decode');
const SlackWebHookManager = require('../slack-webhook-manager/slack-webhook-manager');
const mf = require('../../lib/my-fatoorah');
const { storeOrderStatusError } = require('../root/enums');
const { getModelNameByType, getAuthUser } = require('../../lib/util');
const { kinesisEventTypes, kinesisAdminEventTypes } = require('../../lib/aws-kinesis-logging');
const {
  invalidateCountryConfigsCache,
  invalidatecountryConfigInfoByKeyCache,
} = require('../country-configuration/redis-helper');
const axiosAdapter = require('../../lib/axios-adapter');
const { providerPrioties } = require('../auth/enums');
module.exports = {
  Mutation: {
    async configurationSave(root, { configuration }, context) {
      const validationResult = await context.configuration.validate(
        configuration
      );
      if (validationResult.length > 0)
        return formatError(validationResult, configuration);

      try {
        await context.userActivityLog.create({
          streamId: null,
          stream: streams.CONFIGURATION,
          action: streamActions.UPDATE,
        });
      } catch (err) { }
      return { configuration: context.configuration.save(configuration) };
    },
    async configurationWeeklyScheduleSave(root, { schedule }, context) {
      await context.weeklySchedule.saveForConfiguration(schedule);
      try {
        await context.userActivityLog.create({
          streamId: null,
          stream: streams.CONFIGURATION,
          action: streamActions.UPDATE,
        });
      } catch (err) { }
      return { schedule: context.weeklySchedule.getForCofeDistrict() };
    },
    async brandSave(root, { brand }, context) {
      brand = removeLocalizationField(brand, 'name');
      brand = removeLocalizationField(brand, 'brandDescription');
      const { errors, errorDescription } = await context.brand.validate(brand);

      if (errors.length > 0) {
        const errorResponse = formatError(errors, brand);

        if (errorDescription) {
          errorResponse.errorDescription = errorDescription;
        }

        return errorResponse;
      }
      // return;
      const result = await context.withTransaction('brand', 'save', brand);

      // The save action could have resulted in an auth0 call which may have errored
      if (result.error)
        // Return the error if so
        return assign({}, formatError(result.error, brand), {
          authenticationError: get(result, 'authenticationError', ''),
        });

      const { brandId, authProviderPassword, admins } = result;
      const menu = await context.menu.getByBrandAndCountry(
        brandId,
        brand.countryId
      );
      if (!menu) {
        const menuId = await context.menu.save({
          brandId,
          countryId: brand.countryId,
        });
        if (brand && brand.isPos) {
          await context.db.table('crons').insert({
            id: menuId,
            type: `MENU_${brand.posType}`,
          });
        }
      }
      const adminActivityLog = await getAuthUser(context);
      await context.kinesisLogger.sendLogEvent(
        { ...adminActivityLog, brand, brandId },
        brand.id ? kinesisAdminEventTypes.brandUpdateAdminEvent : kinesisAdminEventTypes.brandCreateAdminEvent,
        'Admin'
      );

      try {
        await context.userActivityLog.create({
          streamId: brandId,
          stream: streams.BRAND,
          action: brand.id ? streamActions.UPDATE : streamActions.CREATE,
        });
      } catch (err) { }

      return {
        brand: addLocalizationField(
          addLocalizationField(await context.brand.getById(brandId), 'name'),
          'brandDescription'
        ),
        authProviderPassword,
        admins,
      };
    },

    async createZendeskTicket(root, { orderId }, context) {
      const permission = await context.orderSet.checkIfIsOnlyAdmin(orderId, 'order:update');
      if (!permission) {
        return;
      }
      let userEmail = context.auth.email;
      if (!userEmail) {
        const user = await context.admin.getById(context.auth.id);
        userEmail = user && user.email;
      }

      try {
        await context.userActivityLog.create({
          streamId: orderId,
          stream: streams.ORDER_SET,
          action: streamActions.UPDATE,
        });
      } catch (err) { }

      return context.zendeskService.createZendeskTicket(orderId, userEmail);
    },
    async couponSave(root, { coupon }, context) {
      const {
        errors,
        errorDescription,
      } = await context.coupon.validateCouponSave(coupon);

      // Format allowedPaymentMethods array
      if (
        coupon.allowedPaymentMethods &&
        coupon.allowedPaymentMethods.length !== 0
      ) {
        coupon.allowedPaymentMethods = `{${coupon.allowedPaymentMethods.join(
          ', '
        )}}`;
      }

      if (coupon.allowedBanks && coupon.allowedBanks.length !== 0) {
        coupon.allowedBanks = `{${coupon.allowedBanks.join(', ')}}`;
      }

      if (coupon.allowedBankCards && coupon.allowedBankCards.length !== 0) {
        coupon.allowedBankCards = `{${coupon.allowedBankCards.join(', ')}}`;
      }

      if (errors.length > 0) {
        const errorResponse = formatError(errors, coupon);
        if (errorDescription) {
          errorResponse.errorDescription = errorDescription;
        }
        return errorResponse;
      }
      const couponId = await context.withTransaction('coupon', 'save', coupon);
      const adminActivityLog = await getAuthUser(context);
      await context.kinesisLogger.sendLogEvent(
        { ...adminActivityLog, coupon },
        kinesisAdminEventTypes.couponSaveAdminEvent,
        'Admin'
      );
      try {
        await context.userActivityLog.create({
          streamId: couponId,
          stream: streams.COUPON,
          action: coupon.id ? streamActions.UPDATE : streamActions.CREATE,
        });
      } catch (err) { }

      return { coupon: context.coupon.getById(couponId) };
    },
    // eslint-disable-next-line complexity
    async customerRegisterLite(root, { customer }, context) {
      console.time('all.customerRegisterLite');
      let errors = [];
      if (customer.email) {
        customer.email = customer.email.trim().toLowerCase();
      }
      // SSO Auth-Service Validation
      if (!customer.otpCode) {
        return formatError(
          [customerRegisterLiteError.OTP_CODE_NOT_PROVIDED],
          customer
        );
      }

      if (customer.isTermsAndConditionsAccepted === false) {
        return formatError(
          [customerRegisterLiteError.TERMS_AND_CONDITIONS_MUST_BE_ACCEPTED],
          customer
        );
      }

      if (customer.isPrivacyPolicyAccepted === false) {
        return formatError(
          [customerRegisterLiteError.PRIVACY_POLICY_MUST_BE_ACCEPTED],
          customer
        );
      }

      console.time('customerRegisterLite.validatePhoneOTP');
      const validation = await context.internalAuthService.validatePhoneOTP(
        customer.phoneNumber,
        customer.otpCode
      );
      console.timeEnd('customerRegisterLite.validatePhoneOTP');
      if (
        !validation ||
        validation.status !==
        singleSignOnStatusName.SUCCESS_NO_USER_RECORD_FOUND
      ) {
        return formatError([customerRegisterLiteError.OTP_VALIDATION_FAILED], {
          customer,
          validation,
        });
      }
      // if all checks out
      const isCustomerRegisteredBefore = await context
        .customerAccountDeletionRequest
        .isCustomerRegisteredBefore({ phoneNumber: customer.phoneNumber });

      customer.isPhoneVerified = true;

      if (!customer.preferredLanguage) {
        customer.preferredLanguage = 'EN';
      }

      let customerWithId = assign(customer, {
        id: uuid.get(),
        phoneNumber: customer.phoneNumber ? customer.phoneNumber : null,
        phoneCountry: customer.phoneCountry ? customer.phoneCountry : null,
      });
      if (customer.isTermsAndConditionsAccepted) {
        customerWithId.termsAndConditionsAcceptDate = moment().toISOString();
      }
      if (customer.privacyPolicyAcceptDate) {
        customerWithId.privacyPolicyAcceptDate = moment().toISOString();
      }
      customerWithId.status = isCustomerRegisteredBefore
        ? customerStatus.ACTIVE
        : customerStatus.NEW;
      customerWithId.created = moment().toISOString();
      if (customer.password && customer.password !== '') {
        customerWithId.password = bcrypt.hashSync(
          customerWithId.password,
          saltRounds
        );
      } else {
        customerWithId.password = defaultUserPasswordHash;
      }
      let countryCodeVal = (customerWithId.countryCode || '').trim();
      if (!countryCodeVal) {
        countryCodeVal = (customerWithId.phoneCountry || '').trim();
      }
      let country;
      if (countryCodeVal) {
        country = await context.country.getByCode(countryCodeVal);
        customerWithId.countryId = country ? country.id : null;
        if (countryCodeVal === 'TR') {
          customerWithId.allowSms = false;
          customerWithId.allowEmail = false;
        }
      }
      customerWithId = omit(customerWithId, [
        'otpCode',
        'countryCode',
        'referralCode',
        'promo',
        'firebaseId',
      ]);

      console.time('customerRegisterLite.validateAndRegister');
      const registerErrors = await context.customer.validateAndRegister(
        customerWithId
      );
      console.timeEnd('customerRegisterLite.validateAndRegister');
      if (registerErrors && registerErrors.length > 0) {
        return formatError(registerErrors, {
          customer,
        });
      }

      console.time('customerRegisterLite.walletAccountCreate');
      await context.walletAccount.getAccounts(customerWithId.id);
      console.timeEnd('customerRegisterLite.walletAccountCreate');

      console.time('customerRegisterLite.registerCustomer');
      // Can be handled asynchronously, via kafka or sqs
      // const authentication = await context.authService.registerCustomer({
      //   ...customerWithId,
      //   password: customer.password,
      //   phoneNumber: customer.phoneNumber || customer.phone,
      // });
      const authentication = await context.internalAuthService.registerCustomer(
        context,
        {
          ...customerWithId,
          password: customer.password,
          phoneNumber: customer.phoneNumber || customer.phone,
        }
      );
      console.timeEnd('customerRegisterLite.registerCustomer');
      console.time('customerRegisterLite.other');
      const eventProperties = { signUp: true };
      // eslint-disable-next-line no-undef
      publishVerifiedEmailToBraze(null, {
        // eslint-disable-next-line camelcase
        external_id: customerWithId.id,
        name: 'customerSignUp',
        time: new Date().toString(),
        properties: eventProperties,
      });
      // send verification email
      if (customerWithId.email) {
        context.internalAuthService
          .requestEmailVerification(customerWithId)
          .then(() => {
            console.log('Verification email is sended.');
          });
      }

      context.customerStats.createForCustomer(customerWithId.id);

      if (
        customer.referralCode
        && !isCustomerRegisteredBefore
        && country
        && country.isReferralActive
      ) {
        const {
          errors: referErrors,
        } = await context.referral.referCustomerByCode(
          customerWithId,
          customer.referralCode
        );
        errors = errors.concat(referErrors);
      }

      !isCustomerRegisteredBefore && context.signupPromo
        .rewardCustomerWithSignupPromo(customerWithId, customer.promo)
        .then(() => {
          console.log('rewardCustomerWithSignupPromo is created.');
        });

      context.withTransaction(
        'discoveryCredit',
        'addDiscoveryCreditsForAllEnabledCountries',
        customerWithId.id
      );

      console.timeEnd('customerRegisterLite.other');
      console.timeEnd('all.customerRegisterLite');
      return {
        error: errors && errors.length > 0 ? errors[0] : null,
        errors,
        authentication,
      };
    },
    async customerUpdate(root, { customer }, context) {
      let customerWithId = assign(customer, { id: context.auth.id });
      const validationResult = await context.customer.validateUpdate(
        customerWithId
      );
      console.log('valid' + validationResult);
      if (validationResult.length > 0)
        return formatError(validationResult, customer);

      const password = customerWithId.password;
      if (customerWithId.password) {
        customerWithId.password = bcrypt.hashSync(
          customerWithId.password,
          saltRounds
        );
      }
      let countryCode = (customerWithId.countryCode || '').trim();
      if (!countryCode) {
        countryCode = (customerWithId.phoneCountry || '').trim();
      }
      if (countryCode) {
        const country = await context.country.getByCode(countryCode);
        customerWithId.countryId = country ? country.id : null;
      }
      customerWithId = omit(customerWithId, 'countryCode');
      customerWithId = omit(customerWithId, 'phoneNumber');
      customerWithId = omit(customerWithId, 'otpCode');
      // we no longer use firebase verification for phoneNumber
      customerWithId = omit(customerWithId, 'isPhoneVerified');

      if (customer.otpCode && customer.phoneNumber) {
        const validation = await context.internalAuthService.validatePhoneOTP(
          customer.phoneNumber,
          customer.otpCode
        );
        console.log('OTP Validation Response : ', validation);
        if (!isNullOrUndefined(validation)) {
          if (
            validation.status ===
            singleSignOnStatusName.SUCCESS_NO_USER_RECORD_FOUND
          ) {
            customerWithId.phoneNumber = customer.phoneNumber;
            customerWithId.isPhoneVerified = true;
          } else if (
            validation.status ===
            singleSignOnStatusName.SUCCESS_EXISTING_USER ||
            validation.status === singleSignOnStatusName.DUPLICATE_PHONE_RECORDS
          ) {
            const phoneInUseError = {
              customer: null,
              error: customerUpdateError.OTP_PHONE_NUMBER_ALREADY_IN_USE,
              errors: [customerUpdateError.OTP_PHONE_NUMBER_ALREADY_IN_USE],
            };
            console.log('phoneInUseError : ', phoneInUseError);
            return phoneInUseError;
          } else {
            const returnObject = {
              customer: null,
              error: customerUpdateError.OTP_FAILED_FOR_PHONE_NUMBER_CHANGE,
              errors: [customerUpdateError.OTP_FAILED_FOR_PHONE_NUMBER_CHANGE],
            };
            console.log('Phone Number Change Error : ', returnObject);
            return returnObject;
          }
        }
      }

      const existingUser = await context.customer.getById(customerWithId.id);
      if (customerWithId.email && existingUser.email !== customerWithId.email) {
        customerWithId.isEmailVerified = false;
      }
      if (
        customerWithId.isTermsAndConditionsAccepted &&
        !existingUser.isTermsAndConditionsAccepted
      ) {
        customerWithId.termsAndConditionsAcceptDate = moment().toISOString();
      }
      if (
        customerWithId.isPrivacyPolicyAccepted &&
        !existingUser.isPrivacyPolicyAccepted
      ) {
        customerWithId.privacyPolicyAcceptDate = moment().toISOString();
      }

      await context.customer.update(customerWithId);

      try {
        await context.authCustomer.update({
          ...customerWithId,
          password,
        });
      } catch (err) {
        console.error('Error in updating customer: ', err);
      }
      // send verification email
      if (
        customerWithId.email &&
        (existingUser.email !== customerWithId.email ||
          existingUser.isEmailVerified === false)
      ) {
        await context.internalAuthService.requestEmailVerification(
          customerWithId
        );
      }
      const changedCustomer = await context.customer.getById(customerWithId.id);
      console.log('Changed Customer : ', changedCustomer);
      return { customer: changedCustomer };
    },
    async customerSaveAddress(root, { address }, context) {
      const customerId = context.auth.id;
      address.customerId = address.customerId ? address.customerId : customerId;

      const validationResult = await context.customerAddress.validate(address);
      if (validationResult.length > 0)
        return formatError(validationResult, address);
      const newAddressId = await context.customerAddress.save(address);
      return {
        customer: await context.customer.getById(address.customerId),
        address: await context.customerAddress.getById(newAddressId),
      };
    },
    async customerDeleteAddress(root, { addressId }, context) {
      const customerId = context.auth.id;
      const validationResult = await context.customerAddress.validate({
        id: addressId,
        customerId,
      });
      if (validationResult.length > 0)
        return formatError(validationResult, { addressId, customerId });
      await context.customerAddress.deleteAddress(customerId, addressId);
      return {
        customer: await context.customer.getById(customerId),
      };
    },
    async customerSetDefaultAddress(root, { addressId }, context) {
      const customerId = context.auth.id;
      const validationResult = await context.customerAddress.validate({
        id: addressId,
        customerId,
      });
      if (validationResult.length > 0)
        return formatError(validationResult, { addressId, customerId });
      await context.customerAddress.setDefaultAddress({
        id: addressId,
        customerId,
      });
      return {
        customer: await context.customer.getById(customerId),
      };
    },
    async customerSaveCar(root, { car }, context) {
      const customerId = context.auth.id;
      car.customerId = car.customerId ? car.customerId : customerId;
      const validationResult = await context.customerCar.validate(car);
      if (validationResult.length > 0)
        return formatError(validationResult, car);
      const newCarId = await context.customerCar.save(car);
      return {
        customer: await context.customer.getById(customerId),
        car: await context.customerCar.getById(newCarId),
      };
    },
    async customerSaveCarLite(root, { car }, context) {
      const customerId = context.auth.id;
      car.customerId = car.customerId ? car.customerId : customerId;
      const validationResult = await context.customerCar.validate(car);
      if (validationResult.length > 0)
        return formatError(validationResult, car);
      await context.customerCar.save(car);
      return true;
    },
    async saveCustomerDeviceMetadata(root, { input }, context) {
      const deviceMetadataFromRequest = assign(input, {
        customerId: context.auth.id,
        deviceId: context.req.xDeviceId || null,
        deviceIdentifierType: context.req.xDeviceIdentifierType || null,
      });
      // Check for initial validation errors
      const validationResult = await context.deviceMetadata.validate(
        deviceMetadataFromRequest
      );

      if (validationResult.length > 0)
        return formatError(validationResult, input);

      const newDeviceMetadataId = await context.deviceMetadata.save(
        deviceMetadataFromRequest
      );
      return {
        deviceMetadata: await context.deviceMetadata.getById(
          newDeviceMetadataId
        ),
      };
    },
    async customerDeleteCar(root, { carId }, context) {
      const customerId = context.auth.id;
      const validationResult = await context.customerCar.validate({
        id: carId,
        customerId,
      });
      if (validationResult.length > 0)
        return formatError(validationResult, { carId, customerId });
      await context.customerCar.deleteCar(customerId, carId);
      return {
        customer: await context.customer.getById(customerId),
      };
    },
    async customerDeleteCarLite(root, { carId }, context) {
      const customerId = context.auth.id;
      const validationResult = await context.customerCar.validate({
        id: carId,
        customerId,
      });
      if (validationResult.length > 0)
        return formatError(validationResult, { carId, customerId });
      await context.customerCar.deleteCar(customerId, carId);
      return true;
    },
    async customerSetDefaultCar(root, { carId }, context) {
      const customerId = context.auth.id;
      const validationResult = await context.customerAddress.validate({
        id: carId,
        customerId,
      });
      if (validationResult.length > 0)
        return formatError(validationResult, { carId, customerId });
      await context.customerCar.setDefaultCar({
        id: carId,
        customerId,
      });
      return {
        customer: await context.customer.getById(customerId),
      };
    },
    async customerRegisterPushDeviceToken(root, { token, service }, context) {
      const customerId = context.auth.id;
      return context.customer.registerPushDeviceToken(
        customerId,
        token,
        service
      );
    },
    customerUnregisterPushDeviceToken(root, { token }, context) {
      return context.customer.unregisterPushDeviceToken(token);
    },
    customerUnregisterAllPushDeviceTokens(root, args, context) {
      const customerId = context.auth.id;
      return context.customer.unregisterAllPushDeviceTokens(customerId);
    },
    async customerSendTestPushNotification(root, { message }, context) {
      const customerId = context.auth.id;
      const args = {
        customerId,
        message,
        notificationCategory: notificationCategories.TEST,
      };
      return context.notification
        .pushCreate(args)
        .then(() => true)
        .catch(() => false);
    },
    customerRequestPhoneVerificationToken(
      root,
      { route, countryCode, phone },
      context
    ) {
      const customerId = context.auth.id;
      return context.customer.requestPhoneVerificationToken(
        customerId,
        route,
        countryCode,
        phone
      );
    },
    customerVerifyPhoneVerificationToken(
      root,
      { token, countryCode, phone },
      context
    ) {
      const customerId = context.auth.id;
      return context.customer.verifyPhoneVerificationToken(
        customerId,
        token,
        countryCode,
        phone
      );
    },
    async customerRequestOTPViaPhoneNumber(
      root,
      { phoneNumber, isAdmin = false, cancelAccountDeletion = false, providerPriority = providerPrioties.PRIMARY },
      context,
    ) {
      const [otpProcess, providerInfos] = await Promise.all([
        context.internalAuthService.otpProcess({
          phoneNumber,
          isAdmin,
          cancelAccountDeletion,
          providerPriority,
        }),
        context.internalAuthService.otpInformationByPhone({ context, phoneNumber }),
      ]);
      return {
        ...otpProcess,
        providerInfos,
      };
    },
    async customerValidateOTPViaPhoneNumber(
      _,
      { phoneNumber, otpCode },
      context
    ) {
      const validation = await context.internalAuthService.validatePhoneOTP(
        phoneNumber,
        otpCode
      );
      // Update phone verified status if the user exists
      if (validation.status === singleSignOnStatusName.SUCCESS_EXISTING_USER) {
        try {
          const decodedJwt =
            validation.token && validation.token.accessToken
              ? jwtDecode(validation.token.accessToken)
              : null;
          let customer = {};
          if (decodedJwt && decodedJwt.jti) {
            const customerId = decodedJwt.jti; // from authService
            customer = await context
              .roDb(context.customer.tableName)
              .where('id', customerId)
              .first();
          } else {
            customer = await context.customer.getByPhoneNumber(phoneNumber);
          }
          if (customer && !customer.isPhoneVerified) {
            customer.isPhoneVerified = true;
            await context.customer.update(customer);
          }
        } catch (err) {
          SlackWebHookManager.sendTextAndErrorToSlack(
            `CustomerValidateOTPViaPhoneNumber is failed for this customer : Number: ${phoneNumber} | Otp: ${otpCode}`,
            err
          );
        }
      }
      return validation;
    },
    async otpInformationByPhone(root, args, context) {
      const { phoneNumber } = args;
      return {
        providerInfos: await context.internalAuthService.otpInformationByPhone({ context, phoneNumber }),
      };
    },
    customerSendCateringRequest(root, args, context) {
      const reqWithCustomerId = assign(args, {
        customerId: context.auth.id,
      });

      return cateringRequestCreate(reqWithCustomerId, context)
        .then(() => true)
        .catch(() => false);
    },
    // async deliveryOrderCreate(root, { order }, context) {
    //   const orderWithCustomerId = assign(order, {
    //     customerId: context.auth.id,
    //     srcPlatform: context.req.xAppOs || null,
    //     srcPlatformVersion: context.req.xAppVersion || null,
    //   });
    //   const result = await context.withTransaction(
    //     'orderSet',
    //     'createDeliveryOrder',
    //     orderWithCustomerId
    //   );
    //   if (result.error) return formatError(result, orderWithCustomerId);
    //   const { paymentUrl, orderSetId, paymentStatus, paymentMethod } = result;
    //   if (
    //     paymentStatus === paymentStatusName.PAYMENT_SUCCESS ||
    //     (paymentMethod === orderPaymentMethods.CASH &&
    //       paymentStatus === paymentStatusName.PAYMENT_PENDING)
    //   ) {
    //     // If payment was set to success, then publish the order
    //     await publishSubscriptionEvent(
    //       context,
    //       orderSetId,
    //       orderSetSubscriptionEvent.ORDER_SET_CREATED
    //     );
    //   }
    //   const orderSet = await context.orderSet.getById(orderSetId);
    //   const response = {
    //     paymentUrl,
    //     orderSet,
    //   };
    //   // await fileLog(`${orderSet.id}.json`, JSON.stringify(response, null, 2));
    //   return response;
    // },
    // async pickupOrderCreate(root, { order }, context) {
    //   const orderWithCustomerId = assign(order, {
    //     customerId: context.auth.id,
    //     srcPlatform: context.req.xAppOs || null,
    //     srcPlatformVersion: context.req.xAppVersion || null,
    //   });
    //   const result = await context.withTransaction(
    //     'orderSet',
    //     'createPickupOrder',
    //     orderWithCustomerId
    //   );
    //
    //   if (result.error) return formatError(result, orderWithCustomerId);
    //   const { paymentUrl, orderSetId, paymentStatus, paymentMethod } = result;
    //   if (
    //     paymentStatus === paymentStatusName.PAYMENT_SUCCESS ||
    //     (paymentMethod === orderPaymentMethods.CASH &&
    //       paymentStatus === paymentStatusName.PAYMENT_PENDING)
    //   ) {
    //     // If payment was set to success, then publish the order
    //     await publishSubscriptionEvent(
    //       context,
    //       orderSetId,
    //       orderSetSubscriptionEvent.ORDER_SET_CREATED
    //     );
    //   }
    //
    //   const orderSet = await context.orderSet.getById(orderSetId);
    //   const response = {
    //     paymentUrl,
    //     orderSet,
    //   };
    //   // await fileLog(`${orderSet.id}.json`, JSON.stringify(response, null, 2));
    //   return response;
    // },
    async deliveryOrderCreateFromOrderPlatform(root, { order }, context) {
      const customerId = order.customerId;
      // paymentMethod will be decided based on order.useCredits if true then it will be CREDITS otherwise CASH.
      const orderWithCustomerId = assign(order, {
        customerId,
        src: orderSetSource.ORDER_PLATFORM,
        paymentMethod: order.useCredits
          ? orderPaymentMethods.CREDITS
          : orderPaymentMethods.CASH,
      });
      const result = await context.withTransaction(
        'orderSet',
        'createDeliveryOrder',
        orderWithCustomerId
      );
      if (result.error) return formatError(result, orderWithCustomerId);
      const { paymentUrl, orderSetId, paymentStatus, paymentMethod } = result;
      if (
        paymentStatus === paymentStatusName.PAYMENT_SUCCESS ||
        (paymentMethod === orderPaymentMethods.CASH &&
          paymentStatus === paymentStatusName.PAYMENT_PENDING)
      ) {
        // If payment was set to success, then publish the order
        await publishSubscriptionEvent(
          context,
          orderSetId,
          orderSetSubscriptionEvent.ORDER_SET_CREATED
        );
      }
      return {
        paymentUrl,
        orderSet: context.orderSet.getById(orderSetId),
      };
    },
    async pickupOrderCreateFromOrderPlatform(root, { order }, context) {
      const customerId = order.customerId;
      // paymentMethod will be decided based on order.useCredits if true then it will be CREDITS otherwise CASH
      const orderWithCustomerId = assign(order, {
        customerId,
        src: orderSetSource.ORDER_PLATFORM,
        paymentMethod: order.useCredits
          ? orderPaymentMethods.CREDITS
          : orderPaymentMethods.CASH,
      });
      const result = await context.withTransaction(
        'orderSet',
        'createPickupOrder',
        orderWithCustomerId
      );

      if (result.error) return formatError(result, orderWithCustomerId);
      const { paymentUrl, orderSetId, paymentStatus, paymentMethod } = result;
      if (
        paymentStatus === paymentStatusName.PAYMENT_SUCCESS ||
        (paymentMethod === orderPaymentMethods.CASH &&
          paymentStatus === paymentStatusName.PAYMENT_PENDING)
      ) {
        // If payment was set to success, then publish the order
        await publishSubscriptionEvent(
          context,
          orderSetId,
          orderSetSubscriptionEvent.ORDER_SET_CREATED
        );
      }
      return {
        paymentUrl,
        orderSet: context.orderSet.getById(orderSetId),
      };
    },
    async orderSetAcknowledge(root, { orderSet }, context) {
      const auth = context.auth;
      const admin = await context.admin.getByAuthoId(auth.id);
      let hasPermission = false;
      /**
       * Logic
       * is Admin?
       * => is Admin Portal Admin => true
       * => is Vendor Admin?
       *    => is Brand Admin? => true
       *    => is Branch Admin? => false
       */
      if (admin) {
        const isVendorAdmin = auth.roles.includes('CSE');
        if (isVendorAdmin) {
          const brandAdminList = await context.brandAdmin.getByAdminId(admin.id);
          const orderSetInfo = await context.orderSet.getById(orderSet.id);
          if (orderSetInfo && brandAdminList.length > 0) {
            const brandLocation = await context.brandLocation.getById(orderSetInfo.brandLocationId);
            hasPermission = findIndex(brandAdminList, brandAdmin => {
              return brandAdmin.brandId === brandLocation.brandId && (brandAdmin.brandLocationId === null || brandAdmin.brandLocationId === brandLocation.id);
            }) > -1;
          }
        } else hasPermission = true;
      }
      if (!hasPermission) return; // [attack_scope]
      const validationResult = await context.orderSet.validate(orderSet);
      if (validationResult.length > 0)
        return formatError(validationResult, orderSet);

      const orderSetId = await context.orderSet.setAcknowledged(orderSet.id);
      await publishSubscriptionEvent(
        context,
        orderSetId,
        orderSetSubscriptionEvent.ORDER_SET_UPDATED
      );
      try {
        await context.userActivityLog.create({
          streamId: orderSetId,
          stream: streams.ORDER_SET,
          action: streamActions.UPDATE,
        });
      } catch (err) { }

      return {
        orderSet: context.orderSet.getById(orderSetId),
      };
    },
    async orderSetSetStatus(root, { orderSetId, status, note }, context) {
      const permission = await context.orderSet.validatePermissionByOrderSetId(orderSetId, 'order:update');
      if (!permission) {
        return;
      }
      const validationResult = await context.orderSetStatus.validate({
        orderSetId,
        status,
        note
      });
      if (validationResult.length > 0) return formatError(validationResult);

      const statusId = await context.orderSetStatus.setStatusForOrderSetId(
        orderSetId,
        status,
        context,
        note
      );
      let autoUpdateStatusId = null;
      const orderfulfillmentType = await context.orderFulfillment.getFulfillmentTypeByOrderSet(orderSetId);
      if (status == orderSetStatusNames.DELIVERED && orderfulfillmentType === fulfillmentType.EXPRESS_DELIVERY) {
        autoUpdateStatusId = await context.orderSetStatus.setStatusForOrderSetId(
          orderSetId,
          orderSetStatusNames.COMPLETED,
          context
        );
      }
      await publishSubscriptionEvent(
        context,
        orderSetId,
        orderSetSubscriptionEvent.ORDER_SET_UPDATED
      );
      const adminActivityLog = await getAuthUser(context);
      await context.kinesisLogger.sendLogEvent(
        { ...adminActivityLog, orderSetId, status },
        kinesisAdminEventTypes.orderStatusChangeAdminEvent,
        'Admin'
      );
      try {
        await context.userActivityLog.create({
          streamId: statusId,
          stream: streams.ORDER_SET_STATUS,
          action: status,
        });
        if (autoUpdateStatusId) {
          await context.userActivityLog.create({
            streamId: autoUpdateStatusId,
            stream: streams.ORDER_SET_STATUS,
            action: orderSetStatusNames.COMPLETED,
          });
        }
      } catch (err) { }
      return { orderSetStatus: context.orderSetStatus.getById(statusId) };
    },
    async bulkOrderSetSetStatus(root, { orderSetIds, status }, context) {
      const {errors: validationResult, updatedOrderSetList } = await context.orderSetStatus.validateBulkOrderSet({
        orderSetIds,
        status,
      });
      if (validationResult.length > 0) return formatError(validationResult);
      const updatedIds = [];
      await Promise.all(
        updatedOrderSetList.map(async updatedOrderSet => {
          let statusId = null;
          if (status == orderSetStatusNames.COMPLETED && updatedOrderSet.paymentMethod == orderPaymentMethods.CASH) {
            await context.orderSet.paidWithCash(updatedOrderSet.id, true);
            const { id } = await context.orderSetStatus.getLatestByOrderSet(updatedOrderSet.id);
            updatedIds.push(id);
          } else {
            statusId = await context.orderSetStatus.setStatusForOrderSetId(
              updatedOrderSet.id,
              status,
              context
            );
            updatedIds.push(statusId);
          }
          let autoUpdateStatusId = null;
          if (status == orderSetStatusNames.DELIVERED && updatedOrderSet.fulfillmentType === fulfillmentType.EXPRESS_DELIVERY) {
            if (updatedOrderSet.paymentMethod == orderPaymentMethods.CASH) {
              await context.orderSet.paidWithCash(updatedOrderSet.id, true);
              const { id } = await context.orderSetStatus.getLatestByOrderSet(updatedOrderSet.id);
              autoUpdateStatusId = id;
            } else {
              autoUpdateStatusId = await context.orderSetStatus.setStatusForOrderSetId(
                updatedOrderSet.id,
                orderSetStatusNames.COMPLETED,
                context
              );
            }
          }
          await publishSubscriptionEvent(
            context,
            updatedOrderSet.id,
            orderSetSubscriptionEvent.ORDER_SET_UPDATED
          );
          try {
            await context.userActivityLog.create({
              streamId: statusId,
              stream: streams.ORDER_SET_STATUS,
              action: status,
            });
            if (autoUpdateStatusId) {
              await context.userActivityLog.create({
                streamId: autoUpdateStatusId,
                stream: streams.ORDER_SET_STATUS,
                action: orderSetStatusNames.COMPLETED,
              });
            }
          } catch (err) { }
        })
      );
      const orderSetList = await context.orderSet.getByIds(updatedOrderSetList.map(orderSet => orderSet.id));
      const orderSetStatusList = await context.orderSetStatus.getById(updatedIds);
      return { orderSetList, orderSetStatusList };
    },
    async orderSetCreateRejection(
      root,
      { orderSetId, rejectionInfo },
      context
    ) {
      const permission = await context.orderSet.validatePermissionByOrderSetId(orderSetId, 'order:update');
      if (!permission) {
        return;
      }


      try {
        console.time('rejectOrder');
        const { statusId, orderSet } = await context.withTransaction(
          'orderSetStatus',
          'rejectOrder',
          orderSetId,
          rejectionInfo
        );
        console.timeEnd('rejectOrder');
        const notifs = await notificationsForStatusChange(
          orderSetId,
          orderSetStatusNames.REJECTED,
          context
        );
        context.notification.createAllIn(notifs).catch(err =>
          console.error({
            func: 'rejectOrder.notification.createAllIn',
            err,
          })
        );
        context.adminBranchSubscription
          .getByBranchId(orderSet.brandLocationId)
          .then(listeners =>
            listeners.map(listener => listener.subscriptionToken),
          )
          .then(tokens =>
            (tokens.length > 0
              ? firebase.sendNotifications(
                notificationType.ORDER_REJECTED,
                { orderSetId },
                {
                  title: 'An Order is Rejected',
                  body: 'A COFE order is rejected, please take action',
                },
                tokens,
              )
              : Promise.resolve(true)),
          );
        publishSubscriptionEvent(
          context,
          orderSetId,
          orderSetSubscriptionEvent.ORDER_SET_UPDATED
        ).catch(err =>
          console.error({
            func: 'orderSetCreateRejection.publishSubscriptionEvent',
            err,
          })
        );
        const adminActivityLog = await getAuthUser(context);
        await context.kinesisLogger.sendLogEvent(
          { ...adminActivityLog, orderSetId, rejectionInfo },
          kinesisAdminEventTypes.orderRejectAdminEvent,
          'Admin'
        );
        context.userActivityLog
          .create({
            streamId: statusId,
            stream: streams.ORDER_SET_STATUS,
            action: orderSetStatusNames.REJECTED,
          })
          .catch(err =>
            console.error({
              func: 'orderSetCreateRejection.userActivityLog.create',
              err,
            })
          );
        return { orderSetStatus: context.orderSetStatus.getById(statusId) };
      } catch (err) {
        return formatError([err]);
      }
      // console.time('orderSetCreateRejection.validation');
      // const validationResult = await context.orderSetStatus.validate({
      //   orderSetId,
      //   status: orderSetStatusNames.REJECTED,
      // });
      // console.timeEnd('orderSetCreateRejection.validation');
      // if (validationResult.length > 0) return formatError(validationResult);
      // console.time('orderSetCreateRejection.createRejectionForOrderSetId');
      // const statusId = await context.orderSetStatus.createRejectionForOrderSetId(
      //   orderSetId,
      //   rejectionInfo,
      //   context
      // );
      // console.time('orderSetCreateRejection.createRejectionForOrderSetId');
    },
    async orderSetUndoRejection(root, { orderSetId }, context) {
      const permission = await context.orderSet.validatePermissionByOrderSetId(orderSetId, 'order:update');
      if (!permission) {
        return;
      }
      const statusId = await context.orderSetStatus.undoRejectionForOrderSetId(
        orderSetId
      );
      await publishSubscriptionEvent(
        context,
        orderSetId,
        orderSetSubscriptionEvent.ORDER_SET_UPDATED
      );
      try {
        await context.userActivityLog.create({
          streamId: orderSetId,
          stream: streams.ORDER_SET,
          action: 'UNDO_' + orderSetStatusNames.REJECTED,
        });
      } catch (err) { }
      return context.orderSetStatus.getById(statusId);
    },
    async reportOrderSet(root, { orderSetId, reportInfo }, context) {
      const permission = await context.orderSet.validatePermissionByOrderSetId(orderSetId, 'order:update');
      if (!permission) {
        return;
      }
      const validationResult = await context.orderSetStatus.validate({
        orderSetId,
        status: orderSetStatusNames.REPORTED,
        note: reportInfo.note
      });
      if (validationResult.length > 0) return formatError(validationResult);
      const statusId = await context.orderSetStatus.createReportForOrderSetId(
        orderSetId,
        reportInfo,
        context
      );
      await publishSubscriptionEvent(
        context,
        orderSetId,
        orderSetSubscriptionEvent.ORDER_SET_UPDATED
      );
      try {
        await context.userActivityLog.create({
          streamId: statusId,
          stream: streams.ORDER_SET_STATUS,
          action: orderSetStatusNames.REPORTED,
        });
      } catch (err) { }
      return { orderSetStatus: context.orderSetStatus.getById(statusId) };
    },
    async orderSetSaveInternalNote(root, { orderSet }, context) {
      const auth = context.auth;
      const admin = await context.admin.getByAuthoId(auth.id);
      let hasPermission = false;
      if (!context.auth.isVendorAdmin) {
        hasPermission = await context.orderSet.validatePermissiosByPermission('order:update');
      } else {
        const brandAdminList = await context.brandAdmin.getByAdminId(admin.id);
        const brandAdmin = first(brandAdminList);
        const orderSetObj = await context.orderSet.getById(orderSet.id);
        const brandLocationId = orderSetObj.brandLocationId;
        const brandLocation = await context.brandLocation.getById(brandLocationId);
        if (brandAdmin.brandId && brandAdmin.brandLocationId
          && brandAdmin.brandId === brandLocation.brandId && brandAdmin.brandLocationId === brandLocation.id) {
          hasPermission = true;
        } else if (brandAdmin.brandId && !brandAdmin.brandLocationId
          && brandAdmin.brandId === brandLocation.brandId) {
          hasPermission = true;
        }
      }
      if (!hasPermission) {
        // [attack_scope]
        return {};
      }

      const comments = orderSet.comments;
      delete orderSet.comments;
      await context.internalComment.save(comments, orderSet.id);
      const validationResult = await context.orderSet.validate(orderSet);
      if (validationResult.length > 0)
        return formatError(validationResult, orderSet);
      return {
        orderSet: context.orderSet.getById(
          await context.orderSet.save(orderSet)
        ),
      };
    },

    async orderSetPayWithCash(root, { orderSetId, wasPaid, note }, context) {
      const auth = context.auth;
      const admin = await context.admin.getByAuthoId(auth.id);
      let hasPermission = false;
      if (admin) {
        const isVendorAdmin = auth.roles.includes('CSE');
        if (isVendorAdmin) {
          const brandAdminList = await context.brandAdmin.getByAdminId(admin.id);
          const orderSet = await context.orderSet.getById(orderSetId);
          if (orderSet && brandAdminList.length > 0) {
            const brandLocation = await context.brandLocation.getById(orderSet.brandLocationId);
            hasPermission = findIndex(brandAdminList, brandAdmin => {
              return brandAdmin.brandId === brandLocation.brandId &&
                (brandAdmin.brandLocationId === brandLocation.id || brandAdmin.brandLocationId === null);
            }) > -1;
          }
        } else hasPermission = true;
      }
      if (!hasPermission) throw new Error('Permission Denied');
      await context.orderSet.paidWithCash(orderSetId, wasPaid, note);
      await publishSubscriptionEvent(
        context,
        orderSetId,
        orderSetSubscriptionEvent.ORDER_SET_UPDATED
      );
      try {
        await context.userActivityLog.create({
          streamId: orderSetId,
          stream: streams.ORDER_SET,
          action: streamActions.UPDATE,
        });
      } catch (err) { }
      return context.orderSet.getById(orderSetId);
    },
    async orderSetRefund(root, { orderSetId, reason }, context) {
      const permission = await context.orderSet.checkIfIsOnlyAdmin(orderSetId, 'order:update');
      if (!permission) {
        return;
      }
      const validationResult = await context.orderSet.validateOrderSetRefund(
        orderSetId
      );
      if (validationResult.length > 0)
        return formatError(validationResult, orderSetId);

      // Make transactional
      // await context.orderSet.orderSetRefund(orderSetId);
      await context.withTransaction(
        'orderSet',
        'orderSetRefund',
        orderSetId,
        reason
      );
      await publishSubscriptionEvent(
        context,
        orderSetId,
        orderSetSubscriptionEvent.ORDER_SET_UPDATED
      );
      const adminActivityLog = await getAuthUser(context);
      await context.kinesisLogger.sendLogEvent(
        { ...adminActivityLog, orderSetId },
        kinesisAdminEventTypes.orderRefundAdminEvent,
        'Admin'
      );
      try {
        await context.userActivityLog.create({
          streamId: orderSetId,
          stream: streams.ORDER_SET,
          action: streamActions.UPDATE,
        });
      } catch (err) { }
      return { orderSet: context.orderSet.getById(orderSetId) };
    },
    async orderItemsRefund(root, { input }, context) {
      if (!input.orderSetId) {
        return;
      }
      const permission = await context.orderSet.checkIfIsOnlyAdmin(input.orderSetId, 'order:update');
      if (!permission) {
        return;
      }
      const validationResult = await context.orderItem.validateOrderItemsRefund(
        input.orderSetId,
        input.orderItems,
        'ORDER_SET'
      );

      if (validationResult.length > 0)
        return formatError(validationResult, input.orderSetId);

      await context.orderItem.orderItemsRefund(
        input.orderSetId,
        input.orderItems,
        loyaltyTransactionType.ORDER_SET_REFUND
      );
      await publishSubscriptionEvent(
        context,
        input.orderSetId,
        orderSetSubscriptionEvent.ORDER_SET_UPDATED
      );
      try {
        await context.userActivityLog.create({
          streamId: input.orderSetId,
          stream: streams.ORDER_SET,
          action: streamActions.UPDATE,
        });
      } catch (err) { }
      return { orderSet: context.orderSet.getById(input.orderSetId) };
    },
    async storeOrderProductsRefund(root, { input }, context) {
      const validationResult = await context.storeOrderProduct.validateStoreOrderProductsRefund(
        input.storeOrderSetId,
        input.storeOrderItems,
        input.storeOrderIds
      );
      if (validationResult.length > 0)
        return formatError(validationResult, input.storeOrderSetId);

      await context.storeOrderProduct.storeOrderProductsRefund(
        input.storeOrderSetId,
        input.storeOrderItems
      );

      input.storeOrderIds.forEach(async storeOrderId => {
        await publishStoreOrderSubscriptionEvent(
          context,
          storeOrderId,
          storeOrderSubscriptionEvent.STORE_ORDER_UPDATED
        );
      });
      return {
        storeOrderSet: context.storeOrderSet.getById(input.storeOrderSetId),
      };
    },
    async storeOrderPayWithCash(root, { storeOrderId }, context) {
      try {
        const statusId = await context.withTransaction(
          'storeOrder',
          'paidWithCash',
          storeOrderId,
        );
        await publishStoreOrderSubscriptionEvent(
          context,
          storeOrderId,
          storeOrderSetSubscriptionEvent.STORE_ORDER_SET_UPDATED
        );
        return { storeOrderStatus: context.storeOrderStatus.getById(statusId) };
      } catch (error) {
        await context.kinesisLogger.sendLogEvent(
          {
            storeOrderId,
            error
          },
          kinesisEventTypes.storeOrderStatusError
        );
        return {
          error: Object.keys(storeOrderStatusError).includes(error)
            ? error
            : storeOrderStatusError.UNEXPECTED_ERROR
        };
      }
    },
    async storeOrderSetRefund(root, { input }, context) {
      const validationResult = await context.storeOrderSet.validateStoreOrderSetRefund(
        input.storeOrderSetId
      );
      if (validationResult.length > 0)
        return formatError(validationResult, input.storeOrderSetId);

      await context.storeOrderSet.storeOrderSetRefund(input.storeOrderSetId);
      await publishStoreOrderSubscriptionEvent(
        context,
        input.storeOrderSetId,
        storeOrderSetSubscriptionEvent.STORE_ORDER_SET_UPDATED
      );
      return {
        storeOrderSet: context.storeOrderSet.getById(input.storeOrderSetId),
      };
    },
    async brandLocationScheduleExceptionSave(
      root,
      { scheduleExceptions },
      context
    ) {
      const scheduleExceptionsToDelete = map(
        filter(scheduleExceptions, { deleted: true }),
        exception => exception.id
      );

      // Delete any schedule exceptions flagged for deletion before
      // checking the validation for any new and/or updated ones.
      // If we don't we get false flag errors for overlapped exceptions that
      // weren't really overlapped because they were supposed to be deleted.
      if (scheduleExceptionsToDelete) {
        await context.scheduleException.deleteWhereIn(
          scheduleExceptionsToDelete
        );
      }

      const validationResult = await context.scheduleException.validate(
        scheduleExceptions
      );

      if (validationResult.length > 0) {
        return formatError(validationResult, scheduleExceptions);
      }

      const scheduleExceptionIds = await context.scheduleException.save(
        scheduleExceptions
      );
      await context.events.saveOperatingHours({
        brandLocationId: scheduleExceptions.length > 0 ? scheduleExceptions[0].brandLocationId : null
      });
      const adminActivityLog = await getAuthUser(context);
      if (scheduleExceptions.length > 0) {
        await context.kinesisLogger.sendLogEvent(
          { ...adminActivityLog, scheduleExceptions, brandLocationId: scheduleExceptions[0].brandLocationId },
          kinesisAdminEventTypes.brandLocationScheduleExceptionsSaveAdminEvent,
          'Admin'
        );
      }
      try {
        await context.userActivityLog.create({
          streamId: scheduleExceptions
            ? scheduleExceptions[0].brandLocationId
            : null,
          stream: streams.BRANCH,
          action: streamActions.UPDATE,
        });
      } catch (err) { }
      return {
        scheduleExceptions: context.scheduleException.getById(
          scheduleExceptionIds
        ),
      };
    },

    async brandLocationWeeklyScheduleSave(
      root,
      { brandLocationId, schedule },
      context
    ) {
      const validationResult = await context.weeklySchedule.validate(
        brandLocationId,
        schedule
      );

      if (validationResult.length > 0)
        return formatError(validationResult, { schedule, brandLocationId });
      await context.withTransaction(
        'weeklySchedule',
        'saveForBrandLocation',
        brandLocationId,
        schedule
      );
      const adminActivityLog = await getAuthUser(context);
      await context.kinesisLogger.sendLogEvent(
        { ...adminActivityLog, brandLocationId, schedule },
        kinesisAdminEventTypes.brandLocationWeeklyScheduleUpdateAdminEvent,
        'Admin'
      );
      try {
        await context.userActivityLog.create({
          streamId: brandLocationId,
          stream: streams.BRANCH,
          action: streamActions.UPDATE,
        });
      } catch (err) { }
      return {
        schedule: context.weeklySchedule.getByBrandLocation(brandLocationId),
      };
    },

    async setBrandLocationAcceptingOrders(
      root,
      { brandLocationId, acceptingOrders, reason },
      context
    ) {
      const auth = context.auth;
      const admin = await context.admin.getByAuthoId(auth.id);
      let hasPermission = false;
      /**
       * Logic
       * is Admin?
       *  admin is undefined return error
       *  admin is defined check this process
       *    => is Admin Portal Admin => true
       *    => is Vendor Admin?
       *      => is Brand Admin? => true
       *      => is Branch Admin? => true
       */
      if (admin) {
        const isVendorAdmin = auth.roles.includes('CSE');
        if (isVendorAdmin) {
          const brandAdminList = await context.brandAdmin.getByAdminId(admin.id);
          const brandLocation = await context.brandLocation.getById(brandLocationId);
          if (brandLocation && brandAdminList.length > 0) {
            hasPermission = findIndex(brandAdminList, brandAdmin => {
              return brandAdmin.brandId === brandLocation.brandId &&
                (brandAdmin.brandLocationId === brandLocation.id || brandAdmin.brandLocationId === null);
            }) > -1;
          }
        } else hasPermission = true;
      }
      if (!hasPermission) return null; // [attack_scope]
      const result = await context.brandLocation.setBrandLocationAcceptingOrders(
        brandLocationId,
        acceptingOrders,
        reason
      );
      if (result.errors) {
        return assign(
          {
            success: false,
          },
          formatError(result.errors, { brandLocationId, acceptingOrders })
        );
      }
      try {
        await context.userActivityLog.create({
          streamId: brandLocationId,
          stream: streams.BRANCH,
          action: streamActions.UPDATE,
        });
      } catch (err) { }
      const brandLocation = await context.brandLocation.getById(brandLocationId);
      return { success: true, brandLocation: addLocalizationField(brandLocation, 'name') };
    },
    async brandLocationsWeeklyScheduleSave(
      root,
      { brandLocationIds, schedule },
      context
    ) {

      // [attack_scope]
      // TODO nested select queries should be optimized
      const id = context.auth.id;
      if (!id) {
        return;
      }
      const admin = await context.admin.getByAuthoId(id);
      if (!admin) {
        return;
      }

      const { brandAdminList, branchAdminList } = context.auth.brandAdminInfo;
      if (!context.auth.isVendorAdmin && brandAdminList.length == 0 && branchAdminList.length == 0) {
        const hasPermission = await context.orderSet.validatePermissiosByPermission('brandlocation:upsert');
        if (!hasPermission) {
          return;
        }
      } else {
        const branches = await context.brandLocation.getAllBranchesByIds(brandLocationIds);
        const brandIds = branches.map(item => item.brandId);
        if (brandIds.length != 1) {
          return;
        }
        if (!brandAdminList.includes(brandIds[0])) {
          return;
        }
      }
      const validationResult = await context.weeklySchedule.validate(
        brandLocationIds,
        schedule
      );

      if (validationResult.length > 0)
        return formatError(validationResult, { schedule, brandLocationIds });
      await context.withTransaction(
        'weeklySchedule',
        'saveForBrandLocation',
        brandLocationIds,
        schedule
      );
      return {
        schedule: [],
      };
    },
    async brandLocationSetUnavailableMenuItem(
      root,
      { menuItemId, brandLocationId, state },
      context
    ) {
      const validationResult = await context.menuItem.validateAvailablity(
        menuItemId,
        brandLocationId
      );

      let hasPermission = false;
      const auth = context.auth;
      const admin = await context.admin.getByAuthoId(auth.id);
      if (!context.auth.isVendorAdmin) {
        hasPermission = await context.orderSet.validatePermissiosByPermission('menu:upsert');
      } else {
        const brandAdminList = await context.brandAdmin.getByAdminId(admin.id);
        if (brandAdminList.length === 1) {
          const fetchedMenuItem = await context.menuItem.getById(menuItemId);
          if (fetchedMenuItem) {
            const brandAdmin = first(brandAdminList);
            if (brandAdmin.brandLocationId === brandLocationId &&
              !validationResult.includes(brandLocationUnavailableMenuItemError.MENU_ITEM_AND_BRAND_NOT_MATCHED)) {
              hasPermission = true;
            }
          }
        }
      }

      if (!hasPermission) {
        // [attack_scope]
        throw new Error('Permission Denied');
      }

      if (validationResult.length > 0)
        return formatError(validationResult, { menuItemId, brandLocationId });

      await context.menuItem.setAvailability(
        menuItemId,
        brandLocationId,
        false,
        state
      );

      const menuItem = addLocalizationMultipleFields(await context.menuItem.getById(menuItemId), ['name', 'itemDescription']);
      /*
      // With automated stock arrangement, we no longer require scheduled notifications for vendor portal
      const branchNotificationTokens = await context.scheduledNotification.getBrandLocationListenerTokens(
        brandLocationId
      );

      await context.scheduledNotification.sendScheduledNotification({
        type: scheduledNotificationEventTypes.STOCK_REMINDER,
        data: {
          // brandLocationId,
          // menuItemId,
          menuItem,
        },
        tokens: branchNotificationTokens,
      });
       */
      try {
        await context.userActivityLog.create({
          streamId: brandLocationId,
          stream: streams.BRANCH,
          action: streamActions.UPDATE,
        });
      } catch (err) { }

      return {
        menuItem,
      };
    },
    async brandLocationUnSetUnavailableMenuItem(
      root,
      { menuItemId, brandLocationId },
      context
    ) {
      const validationResult = await context.menuItem.validateAvailablity(
        menuItemId,
        brandLocationId
      );

      let hasPermission = false;
      const auth = context.auth;
      const admin = await context.admin.getByAuthoId(auth.id);
      if (!context.auth.isVendorAdmin) {
        hasPermission = await context.orderSet.validatePermissiosByPermission('menu:upsert');
      } else {
        const brandAdminList = await context.brandAdmin.getByAdminId(admin.id);
        if (brandAdminList.length === 1) {
          const fetchedMenuItem = await context.menuItem.getById(menuItemId);
          if (fetchedMenuItem) {
            const brandAdmin = first(brandAdminList);
            if (brandAdmin.brandLocationId === brandLocationId &&
              !validationResult.includes(brandLocationUnavailableMenuItemError.MENU_ITEM_AND_BRAND_NOT_MATCHED)) {
              hasPermission = true;
            }
          }

        }
      }

      if (!hasPermission) {
        // [attack_scope]
        return {};
      }

      if (validationResult.length > 0)
        return formatError(validationResult, { menuItemId, brandLocationId });

      await context.menuItem.setAvailability(menuItemId, brandLocationId, true);
      const menuItem = addLocalizationMultipleFields(await context.menuItem.getById(menuItemId), ['name', 'itemDescription']);

      try {
        await context.userActivityLog.create({
          streamId: brandLocationId,
          stream: streams.BRANCH,
          action: streamActions.UPDATE,
        });
      } catch (err) { }
      return {
        menuItem,
      };
    },

    /**
     * Not used in Admin and Vendor Portal
     * DEPRECATED
     */
    /*
    async brandMenuSave(root, { menu }, context) {
      const result = await context.menu.save(menu);
      const menuResult = await context.menu.getById(result);
      return { menu: menuResult };
    },
    */

    async brandMenuSectionSave(root, { menuSection }, context) {
      // get brand id from menu sections all of them in one query
      // if brand id is not one return false (this is an attack)
      // get admin id from token
      // compare the brand id
      // [attack_scope]
      // TODO nested select queries should be optimized
      const id = context.auth.id;
      if (!id) {
        return;
      }
      const admin = await context.admin.getByAuthoId(id);
      if (!admin) {
        return;
      }

      const { brandAdminList, branchAdminList } = context.auth.brandAdminInfo;
      const menu = await context.menu.getById(menuSection.menuId);
      if (!context.auth.isVendorAdmin && brandAdminList.length == 0 && branchAdminList.length == 0) {
        const hasPermission = await context.orderSet.validatePermissiosByPermission('menu:upsert');
        if (!hasPermission) {
          return;
        }
      } else {
        if (!menu || !brandAdminList.includes(menu.brandId)) {
          // TODO: Add return error
          // INVALID_MENU_ID => invalid menu
          // UNAUTHORIZED_BRAND_ADMIN => other brand menu section
          return;
        }
        /* const menuIds = menuSections.map((item) => item.menuId);
        const brandIds = await context.menu.getBrandsByMenuId(menuIds);
        if (brandIds.length != 1) {
          return;
        }
        if (!brandAdminList.includes(brandIds[0])) {
          return;
        } */
      }

      menuSection = removeLocalizationField(menuSection, 'name');
      //menuSections = removeLocalizationField(menuSections, 'name');
      const validationResult = await context.menuSection.validate([menuSection]);

      if (validationResult.length > 0)
        return formatError(validationResult, menuSection);
      //const menuSection = menuSections[0];
      //const brandId = await context.menu.getBrandsByMenuId([menuSection.menuId]);

      let updateAllItems = false;
      if (!menuSection.id) {
        menuSection.status = statusTypes.INACTIVE;
      } else {
        const oldMenuSection = await context.menuSection.getById(menuSection.id);
        /// keeping the existing SortOrder
        menuSection.sortOrder = oldMenuSection.sortOrder;
        updateAllItems = oldMenuSection.status != menuSection.status;
      }
      const menuSections = await context.withTransaction('menuSection', 'saveWithProvidedSortOrder', [menuSection]);
      const sectionId = menuSections[0];
      if (!menuSection.id || (menuSection.id && updateAllItems)) {
        const menuItems = await context.menuItem.getByMenuSection(sectionId);
        await Promise.all(menuItems.map(async (item) => {
          await context.menuItem.updateStatusById(item.id, menuSection.status);
          await context.menuItem.setMenuItemStasusForBrand(menuSection.status, menu.brandId, item.id);
        }));
      }
      return { menuSection: addLocalizationField(await context.menuSection.selectFields('*').where('id', sectionId).first(), 'name') };

      // const result = addLocalizationField(
      //   await context.menuSection.getByMenu(menuSection.menuId),
      //   'name'
      // );
      // for await (const sectionObject of result) {
      //   if (menuSection.id === sectionObject.id) {
      //     const menuItems = await context.menuItem.getByMenuSection(sectionObject.id);
      //     if (menuItems.length > 0) {
      //       let status = statusTypes.INACTIVE;
      //       const menuSectionRecord = await context.menuSection.getMenuByMenuSectionId(sectionObject.id);
      //       if (menuSectionRecord) { status = menuSections[0].status; }
      //       await Promise.all(menuItems.map(async (item) => {
      //         /* Update status of menu items under this menu section */
      //         await context.menuItem.updateStatusById(item.id, status);
      //         /* Update status of menu items for all branches */
      //         await context.menuItem.setMenuItemStausForBrand(status, brandId[0], item.id);
      //       }));
      //     }
      //   }
      // }
      // return {
      //   menuSections: [...result]
      // };
    },
    async brandMenuItemSave(root, { menuItem }, context) {
      menuItem = removeLocalizationMultipleFields(menuItem, ['name', 'itemDescription']);
      /**
       * Only Brand admin or Cofe Admin
       * When brand admin, check valid brand admin
       * If update process check is it valid
       * If menu item status is active and section isn't throw error
       */
      const validationResult = await context.menuItem.validate(
        [menuItem],
        context,
        'menu:upsert'
      );

      if (validationResult.length > 0)
        return formatError(validationResult, menuItem);

      const menuSection = await context.menuSection.getById(menuItem.sectionId);
      const menu = await context.menu.getById(menuSection.menuId);
      let updateAllBranchItemStatus = false;
      if (menuItem.id) {
        const oldMenuItem = await context.menuItem.getById(menuItem.id);
        updateAllBranchItemStatus = (menuSection.status == statusTypes.ACTIVE && oldMenuItem.status != menuItem.status);
      } else {
        menuItem.status = statusTypes.INACTIVE;
      }
      const menuItems = await context.withTransaction('menuItem', 'save', [menuItem]);
      const menuItemId = menuItems[0];
      if (!menuItem.id || (menuItem.id && updateAllBranchItemStatus)) {
        await context.menuItem.setMenuItemStasusForBrand(menuItem.status, menu.brandId, menuItemId);
      }
      return { menuItem: addLocalizationMultipleFields(await context.menuItem.selectFields('*').where('id', menuItemId).first(), ['name', 'itemDescription']) };
      // menuItems = removeLocalizationField(
      //   removeLocalizationField(menuItems, 'name'),
      //   'itemDescription'
      // );
      // const validationResult = await context.menuItem.validate(
      //   menuItems,
      //   context,
      //   'menu:upsert'
      // );
      // if (validationResult.length > 0)
      //   return formatError(validationResult, menuItems);
      // const [first] = new Set(menuItems.map(x => x.sectionId));
      // let status = [...new Set(menuItems.map(x => x.status))][0];
      // const menuItemId = [...new Set(menuItems.map(x => x.id))][0];
      // const menuSection = await context.menuSection.getById(first);
      // const menu = await context.menu.getById(menuSection.menuId);
      // const itemRecord = await context.menuItem.getById(menuItemId);
      // if (!itemRecord) { status = statusTypes.INACTIVE; }
      // const result = addLocalizationMultipleFields(
      //   flatten(
      //     await Promise.all(
      //       map(
      //         await context.withTransaction('menuItem', 'save', menuItems),
      //         menuItemId => context.menuItem.getById(menuItemId)
      //       )
      //     )
      //   ),
      //   ['name', 'itemDescription']
      // );
      // for await (const menuObject of result) {
      //   /* Update status of menu items for all branches*/
      //   await context.menuItem.setMenuItemStausForBrand(status, menu.brandId, menuObject.id);
      // }
      // return {
      //   menuItems: [...result]
      // };

    },
    async brandMenuItemSorting(root, { menuItems }, context) {
      const sorted = await context.withTransaction(
        'menuItem',
        'sortMenuItems',
        menuItems
      );
      return {
        sorted,
      };
    },
    async brandMenuItemDelete(root, { menuItemId }, context) {
      const validationResult = await context.menuItem.validateDeleteMenuItem(menuItemId);
      if (validationResult.length > 0)
        return formatError(validationResult, menuItemId);

      const deleted = await context.withTransaction(
        'menuItem',
        'deleteMenuItem',
        menuItemId
      );
      return {
        deleted,
      };
    },
    async brandMenuSectionDelete(root, { menuSectionId }, context) {
      // get brand id from menu sections all of them in one query
      // if brand id is not one return false (this is an attack)
      // get admin id from token
      // compare the brand id
      // [attack_scope]
      // TODO nested select queries should be optimized
      const id = context.auth.id;
      if (!id) {
        return;
      }
      const admin = await context.admin.getByAuthoId(id);
      if (!admin) {
        return;
      }

      const { brandAdminList, branchAdminList } = context.auth.brandAdminInfo;
      if (!context.auth.isVendorAdmin && brandAdminList.length == 0 && branchAdminList.length == 0) {
        const hasPermission = await context.orderSet.validatePermissiosByPermission('menu:upsert');
        if (!hasPermission) {
          return;
        }
      } else {
        const menuIds = await context.menuSection.getMenuByMenuSectionId(menuSectionId);
        const brandIds = await context.menu.getBrandsByMenuId(menuIds);
        if (brandIds.length != 1) {
          return;
        }
        if (!brandAdminList.includes(brandIds[0])) {
          return;
        }
      }

      const validationResult = await context.menuSection.validateMenuSectionDelete(
        menuSectionId
      );

      if (validationResult.length > 0) {
        return formatError(validationResult, menuSectionId);
      }

      const deleted = await context.withTransaction(
        'menuSection',
        'deleteMenuSection',
        menuSectionId
      );
      return {
        deleted,
      };
    },
    async brandMenuSectionSorting(root, { menuSections }, context) {
      // get brand id from menu sections all of them in one query
      // if brand id is not one return false (this is an attack)
      // get admin id from token
      // compare the brand id
      // [attack_scope]
      // TODO nested select queries should be optimized
      const id = context.auth.id;
      if (!id) {
        return;
      }
      const admin = await context.admin.getByAuthoId(id);
      if (!admin) {
        return;
      }

      const { brandAdminList, branchAdminList } = context.auth.brandAdminInfo;
      if (!context.auth.isVendorAdmin && brandAdminList.length == 0 && branchAdminList.length == 0) {
        const hasPermission = await context.orderSet.validatePermissiosByPermission('menu:upsert');
        if (!hasPermission) {
          return;
        }
      } else {
        const menuSectionIds = menuSections.map((item) => item.id);
        const menuSectionsWithMenuIds = await context.menuSection.getById(menuSectionIds);
        const menuIds = menuSectionsWithMenuIds.map((item) => item.menuId);
        const brandIds = await context.menu.getBrandsByMenuId(menuIds);
        if (brandIds.length != 1) {
          return;
        }
        if (!brandAdminList.includes(brandIds[0])) {
          return;
        }
      }
      const sorted = await context.withTransaction(
        'menuSection',
        'sortMenuSections',
        menuSections
      );
      return {
        sorted,
      };
    },
    async brandLocationSave(root, { brandId, brandLocation }, context) {
      brandLocation = removeLocalizationField(brandLocation, 'name');
      brandLocation.brandId = brandId;
      const { errors, errorDescription } = await context.brandLocation.validate(
        brandLocation
      );
      if (errors.length > 0) {
        const errorResponse = formatError(errors, brandLocation);
        if (errorDescription) {
          errorResponse.errorDescription = errorDescription;
        }
        return errorResponse;
      }
      const result = await context.withTransaction(
        'brandLocation',
        'save',
        brandLocation
      );

      if (result.error)
        return assign({}, formatError(result.error, brandLocation), {
          authenticationError: get(result, 'authenticationError', ''),
        });

      const { brandLocationId, authProviderPassword, admins } = result;
      const adminActivityLog = await getAuthUser(context);
      await context.kinesisLogger.sendLogEvent(
        { ...adminActivityLog, brandLocation, brandId },
        brandLocation.id ? kinesisAdminEventTypes.brandLocationUpdateAdminEvent : kinesisAdminEventTypes.brandLocationCreateAdminEvent,
        'Admin'
      );
      try {
        await context.userActivityLog.create({
          streamId: brandLocationId,
          stream: streams.BRANCH,
          action: brandLocation.id
            ? streamActions.UPDATE
            : streamActions.CREATE,
        });
      } catch (err) { }

      return {
        brandLocation: addLocalizationField(
          await context.brandLocation.getById(brandLocationId),
          'name'
        ),
        authProviderPassword,
        admins,
      };
    },
    async setCustomerIsPresent(root, { orderSetId }, context) {
      const { id: customerId } = context.auth;

      const {
        shouldNotify,
        orderSet,
        error,
      } = await context.orderFulfillment.setCustomerIsPresent(
        orderSetId,
        customerId
      );

      if (shouldNotify) {
        await publishSubscriptionEvent(
          context,
          orderSetId,
          orderSetSubscriptionEvent.ORDER_SET_UPDATED
        );
      }

      try {
        await context.userActivityLog.create({
          streamId: orderSetId,
          stream: streams.ORDER_SET,
          action: streamActions.UPDATE,
        });
      } catch (err) { }

      return {
        orderSet,
        error,
      };
    },
    async orderAssignCourier(root, { orderSetId, courierName }, context) {
      const permission = await context.orderSet.validatePermissionByOrderSetId(orderSetId, 'order:update');
      if (!permission) {
        return;
      }
      const validationResult = await context.orderFulfillment.validateCourierAssignment(
        orderSetId,
        courierName
      );
      if (validationResult.length > 0)
        return formatError(validationResult, { orderSetId, courierName });
      await context.orderFulfillment.assignCourierByOrderSetId(
        orderSetId,
        courierName
      );
      const orderSet = await context.orderSet.getById(orderSetId);
      await publishSubscriptionEvent(
        context,
        orderSetId,
        orderSetSubscriptionEvent.ORDER_SET_UPDATED
      );
      try {
        await context.userActivityLog.create({
          streamId: orderSetId,
          stream: streams.ORDER_SET,
          action: streamActions.UPDATE,
        });
      } catch (err) { }
      return {
        courierName,
        orderSet,
      };
    },
    async customerSetLoyaltyTier(
      root,
      { customerId, loyaltyTierName },
      context
    ) {
      const result = await context.withTransaction(
        'customer',
        'assignLoyaltyTierByName',
        customerId,
        loyaltyTierName
      );
      const customer = context.customer.getById(customerId);
      if (result.error) return formatError(result.errors, customer);
      return {
        customer,
      };
    },
    /*async marketingNotificationSave(root, { notification }, context) {
      // marketingNotification.save will Internally validate data
      const result = await context.withTransaction(
        'marketingNotification',
        'save',
        notification
      );
      if (result.error) return formatError(result, notification);
      const { marketingNotificationId } = result;
      return {
        notification: context.marketingNotification.getById(
          marketingNotificationId
        ),
      };
    },
    async marketingNotificationDelete(root, { id }, context) {
      return context.marketingNotification.delete(id);
    },*/
    async orderSetCommentAdd(root, { orderSetComment }, context) {
      // TODO: Fetch User Info for real
      if (!orderSetComment || orderSetComment.orderSetId) {
        return;
      }
      const permission = await context.orderSet.validatePermissionByOrderSetId(orderSetComment.orderSetID, 'order:update');
      if (!permission) {
        return;
      }

      orderSetComment.userId = context.auth.id;
      if (context.auth.name && context.auth.email) {
        orderSetComment.userName = context.auth.name;
        orderSetComment.userEmail = context.auth.email;
      } else {
        const admin = await context.admin.getByAuthoId(context.auth.id);
        orderSetComment.userName = admin.name;
        orderSetComment.userEmail = admin.email;
      }


      const result = await context.withTransaction(
        'orderSetComment',
        'save',
        orderSetComment
      );
      if (result.error) return formatError(result, orderSetComment);
      return {
        orderSetComment: context.orderSetComment.getById(result),
      };
    },
    async currencySave(root, { currencyInput }, context) {
      currencyInput = removeLocalizationField(
        removeLocalizationField(currencyInput, 'symbol'),
        'subunitName'
      );
      // Check for initial validation errors
      const validationResult = await context.currency.validate(currencyInput);
      if (validationResult.length > 0)
        return formatError(validationResult, currencyInput);

      await invalidateCountryCurrencyLookup();
      const currencyId = await context.currency.save(currencyInput);
      const currency = await context.currency.getById(currencyId);

      try {
        await context.userActivityLog.create({
          streamId: currencyId,
          stream: streams.CURRENCY,
          action: currencyInput.id
            ? streamActions.UPDATE
            : streamActions.CREATE,
        });
      } catch (err) { }

      return {
        currency: addLocalizationField(
          addLocalizationField(currency, 'symbol'),
          'subunitName'
        ),
      };
    },
    async countrySave(root, { countryInput }, context) {
      countryInput = removeLocalizationField(countryInput, 'name');
      // Check for initial validation errors
      const validationResult = await context.country.validate(countryInput);

      if (validationResult.length > 0) {
        return formatError(validationResult, countryInput);
      }
      await invalidateCountryCurrencyLookup();

      countryInput.isReferralActive = countryInput.isReferralActive
        ? countryInput.isReferralActive
        : false;

      const countryConfigurations = countryInput.countryConfigurations || [];

      delete countryInput.countryConfigurations;
      const countryId = await context.country.save(countryInput);


      await invalidateCountryConfigsCache();
      await invalidatecountryConfigInfoByKeyCache();

      for (const countryConfiguration of countryConfigurations) {
        const configurationKey = countryConfiguration.key;
        let configurationValue = countryConfiguration.value;
        if (configurationKey === 'I_AM_HERE_PICKUP_OPTIONS' || configurationKey === 'I_AM_HERE_CAR_OPTIONS') {
          let values = configurationValue.split(/[, ]+/g).filter(Boolean);
          let ignoreValue = false;
          if (values.length > 0) {
            values.map(value => {
              ignoreValue = ignoreValue || isNaN(value) || Math.sign(value) < 0;
            });
          } else ignoreValue = true;
          if (ignoreValue) continue;
          if (!values.includes('0')) values.push('0');
          values = values.map(Number).sort((a, b) => (a - b));
          configurationValue = values.toString();
        }
        // eslint-disable-next-line no-await-in-loop
        await context.countryConfiguration.saveOrUpdateByCountryId({
          countryId,
          configurationKey,
          configurationValue,
        });
      }

      try {
        await context.userActivityLog.create({
          streamId: countryId,
          stream: streams.COUNTRY,
          action: countryInput.id ? streamActions.UPDATE : streamActions.CREATE,
        });
      } catch (err) { }

      return {
        country: addLocalizationField(
          await context.country.getById(countryId),
          'name'
        ),
      };
    },
    async citySave(root, { cityInput }, context) {
      cityInput = removeLocalizationField(cityInput, 'name');
      // Check for initial validation errors
      const validationResult = await context.city.validate(cityInput);

      if (validationResult.length > 0) {
        return formatError(validationResult, cityInput);
      }

      const cityId = await context.city.save(cityInput);

      try {
        await context.userActivityLog.create({
          streamId: cityId,
          stream: streams.CITY,
          action: cityInput.id ? streamActions.UPDATE : streamActions.CREATE,
        });
      } catch (err) { }

      return {
        city: addLocalizationField(await context.city.getById(cityId), 'name'),
      };
    },
    async neighborhoodSave(root, { neighborhoodInput }, context) {
      // Check for initial validation errors
      neighborhoodInput = removeLocalizationField(neighborhoodInput, 'name');
      const validationResult = await context.neighborhood.validate(
        neighborhoodInput
      );
      if (validationResult.length > 0)
        return formatError(validationResult, neighborhoodInput);

      const neighborhoodId = await context.neighborhood.save(neighborhoodInput);
      const niberhood = await context.neighborhood.getById(neighborhoodId);
      try {
        await context.userActivityLog.create({
          streamId: neighborhoodId,
          stream: streams.NEIGHBOURHOOD,
          action: neighborhoodInput.id
            ? streamActions.UPDATE
            : streamActions.CREATE,
        });
      } catch (err) { }

      return {
        neighborhood: addLocalizationField(niberhood, 'name'),
      };
    },
    ...require('../reward/mutations'),
    ...require('../reward-tier/mutations'),
    ...require('../reward-tier-perk/mutations'),
    async brandLocationPriceRuleSave(
      root,
      { brandLocationPriceRuleInputs },
      context
    ) {
      const auth = context.auth;
      const admin = await context.admin.getByAuthoId(auth.id);
      if (!admin || (admin && auth.isVendorAdmin)) {
        return formatError([brandLocationPriceRuleError.UNAUTHORIZED_ADMIN], brandLocationPriceRuleInputs);
      }
      const validationResult = await context.brandLocationPriceRule.validate(
        brandLocationPriceRuleInputs
      );
      if (validationResult.length > 0) {
        return formatError(validationResult, brandLocationPriceRuleInputs);
      }

      await context.withTransaction(
        'brandLocationPriceRule',
        'save',
        brandLocationPriceRuleInputs
      );
      const { brandLocationId } = brandLocationPriceRuleInputs[0];
      return {
        priceRules: await context.brandLocationPriceRule.getByBrandLocation(
          brandLocationId
        ),
      };
    },
    async invalidateBrandLocationCMenu(root, { brandLocationId }, context) {
      try {
        await context.userActivityLog.create({
          streamId: brandLocationId,
          stream: streams.MENU,
          action: streamActions.UPDATE,
        });
      } catch (err) { }
      return context.brandLocation.invalidateMenu(brandLocationId);
    },
    async invalidateAllCMenus(root, args, context) {
      await invalidateAllMenus();
      try {
        await context.userActivityLog.create({
          streamId: null,
          stream: streams.MENU,
          action: streamActions.UPDATE,
        });
      } catch (err) { }
      return true;
    },

    async bannerSave(root, { bannerInput }, context) {
      const result = await context.banner.save(bannerInput);
      if (result.error) return formatError(result, bannerInput);
      const { bannerId } = result;
      try {
        await context.userActivityLog.create({
          streamId: bannerId,
          stream: streams.BANNER,
          action: bannerInput.id ? streamActions.UPDATE : streamActions.CREATE,
        });
      } catch (err) { }
      return {
        banner: await context.banner.getById(bannerId),
      };
    },

    async bannerDelete(root, { id }, context) {
      try {
        await context.userActivityLog.create({
          streamId: id,
          stream: streams.BANNER,
          action: streamActions.DELETE,
        });
      } catch (err) { }
      return context.banner.delete(id);
    },

    async updateCofeCredits(root, { input }, context) {
      const inputWithAuthId = assign(input, {
        userId: context.auth.id,
      });
      const validationResult = await context.loyaltyTransaction.validateUpdateCofeCredits(
        inputWithAuthId
      );
      if (validationResult.length > 0) {
        return formatError(validationResult, inputWithAuthId);
      }

      // Make transactional
      // await context.loyaltyTransaction.updateCofeCredits(inputWithAuthId);
      await context.withTransaction(
        'loyaltyTransaction',
        'updateCofeCredits',
        inputWithAuthId
      );
      const adminActivityLog = await getAuthUser(context);
      adminActivityLog.input = input;
      await context.kinesisLogger.sendLogEvent(
        adminActivityLog,
        kinesisAdminEventTypes.customerWalletUpdateAdminEvent,
        'Admin'
      );

      try {
        await context.userActivityLog.create({
          streamId: input.customerId,
          stream: streams.COFE_CREDIT,
          action: streamActions.UPDATE,
        });

        await context.db.raw(
          `INSERT INTO wallet_update_logs (
            admin_id,
            customer_id,
            currency_id,
            brand_id,
            tx_amount,
            tx_type,
            tx_action,
            tx_reason,
            comments
          ) VALUES (?,?,?,?,?,?,?,?,?)`, [
            adminActivityLog.adminId || null,
            input.customerId,
            input.currencyId,
            input.brandId || null,
            input.amount,
            input.operationType,
            streamActions.UPDATE,
            input.reason || null,
            input.comments || null,
          ]);

      } catch (ex) {
        const { stack, message } = ex || {};
        console.error('cofe-update-credits-exception >', { stack, message });
        await context.kinesisLogger.sendLogEvent(
          { stack, message },
          'cofe-update-credits-exception',
        );
      }

      return {
        success: true,
      };
    },

    async goldenCofeSave(root, { goldenCofeInput }, context) {
      goldenCofeInput.dateRange = goldenCofeInput.dateRange
        ? goldenCofeInput.dateRange
        : {};

      if (goldenCofeInput.dateRange.startDate) {
        goldenCofeInput.dateRange.startDate = moment(
          goldenCofeInput.dateRange.startDate
        ).format('YYYY-MM-DD');
      }
      if (goldenCofeInput.dateRange.endDate) {
        goldenCofeInput.dateRange.endDate = moment(
          goldenCofeInput.dateRange.endDate
        ).format('YYYY-MM-DD');
      }

      await context.goldenCofe.save(goldenCofeInput);
      try {
        await context.userActivityLog.create({
          streamId: null,
          stream: streams.GOLDEN_COFE,
          action: streamActions.UPDATE,
        });
      } catch (err) { }
      return context.goldenCofe.getByCountryCode(goldenCofeInput.countryCode);
    },

    async addressFieldsSave(root, { addressFieldInput }, context) {
      await context.addressField.save(addressFieldInput);
      return {
        addressFields: await context.addressField.getAllByCountryCode(
          addressFieldInput.countryCode
        ),
      };
    },

    async loyaltyTierSave(root, { loyaltyTierInput }, context) {
      const loyaltyBonuses =
        loyaltyTierInput.loyaltyBonuses &&
          loyaltyTierInput.loyaltyBonuses.length
          ? loyaltyTierInput.loyaltyBonuses
          : null;
      let deletedLoyaltyBonus = [];

      // Validate Loyalty tier
      let loyaltyBonusValidationErrors = [];
      let loyaltyTierValidationErrors = await context.loyaltyTier.validate(
        loyaltyTierInput
      );

      if (loyaltyBonuses) {
        // Filter out and remove deleted loyalty bonuses.
        deletedLoyaltyBonus = loyaltyBonuses.filter(lb => lb.deleted);
        deletedLoyaltyBonus.forEach(dlb =>
          loyaltyBonuses.splice(
            loyaltyBonuses.findIndex(lb => lb.name === dlb.name),
            1
          )
        );

        // Validate loyalty Bonuses
        loyaltyBonusValidationErrors = await context.loyaltyBonus.validate(
          loyaltyBonuses,
          (loyaltyTierInput.customAmount && 'CUSTOM') || 'FIXED'
        );
      }
      loyaltyTierValidationErrors = loyaltyTierValidationErrors.concat(
        loyaltyBonusValidationErrors
      );
      if (loyaltyTierValidationErrors.length > 0) {
        return formatError(loyaltyTierValidationErrors, loyaltyTierInput);
      }

      delete loyaltyTierInput.loyaltyBonuses;
      const id = await context.loyaltyTier.save(loyaltyTierInput);

      if (loyaltyBonuses) {
        await Promise.all(
          loyaltyBonuses.map(loyaltyBonus => {
            loyaltyBonus.loyaltyTierId = id;
            delete loyaltyBonus.deleted; // Remove extra key
            return context.loyaltyBonus.save(loyaltyBonus);
          })
        );
      }
      if (deletedLoyaltyBonus.length > 0) {
        await context.loyaltyBonus.deleteByIds(
          deletedLoyaltyBonus.map(e => e.id)
        );
      }
      // It is easier to invalidate all cache at once
      await invalidateLoyaltyTiersCache();
      return {
        loyaltyTier: await context.loyaltyTier.getById(id),
      };
    },
    async saveAdminWithBrandAndLocations(root, { brandAdmin }, context) {
      // Check for initial validation errors
      const validationResult = await context.admin.validate(brandAdmin);
      if (validationResult.length > 0)
        return formatError(validationResult, brandAdmin);
      const admin = await context.withTransaction(
        'admin',
        'createAdminWithBrandAndLocations',
        brandAdmin
      );
      return { admin: admin.admin };
    },
    async groupSave(root, { groupInput }, context) {
      // Check for initial validation errors
      const validationResult = await context.group.validate(groupInput);

      if (validationResult.length > 0) {
        return formatError(validationResult, groupInput);
      }

      const groupId = await context.group.saveGroup(groupInput);

      return {
        group: context.group.getById(groupId),
      };
    },
    async roleSave(root, { roleInput }, context) {
      // Check for initial validation errors
      const validationResult = await context.role.validate(roleInput);

      if (validationResult.length > 0) {
        return formatError(validationResult, roleInput);
      }

      const roleId = await context.role.saveRole(roleInput);

      return {
        role: context.role.getById(roleId),
      };
    },
    async permissionSave(root, { permissionInput }, context) {
      // Check for initial validation errors
      const validationResult = await context.permission.validate(
        permissionInput
      );

      if (validationResult.length > 0) {
        return formatError(validationResult, permissionInput);
      }

      const permissionId = await context.permission.save(permissionInput);

      return {
        permission: context.permission.getById(permissionId),
      };
    },
    async addUserToGroups(root, { input }, context) {
      const admin = await context.admin.addUserToGroups(input);

      return admin;
    },
    async createGroupAdmin(root, { input }, context) {
      const {
        errors,
        errorDescription,
      } = await context.admin.validateAuth0Register(input);
      if (errors.length > 0) {
        const errorResponse = formatError(errors, input);

        if (errorDescription) {
          errorResponse.errorDescription = errorDescription;
        }

        return errorResponse;
      }
      const result = await context.admin.createGroupAdmin(input);
      return {
        admin: result.admin,
        authProviderPassword: result.authProviderPassword,
      };
    },
    async updateGroupAdmin(root, { input }, context) {
      const {
        errors,
        errorDescription,
      } = await context.admin.validateAuth0Register(input);
      if (errors.length > 0) {
        const errorResponse = formatError(errors, input);

        if (errorDescription) {
          errorResponse.errorDescription = errorDescription;
        }

        return errorResponse;
      }
      return context.admin.updateGroupAdmin(input);
    },
    async removeGroupAdmin(root, { input }, context) {
      const validationResult = await context.groupAdmin.validateGroupAdminDelete(
        input
      );

      if (validationResult.length > 0) {
        return formatError(validationResult, input);
      }
      await context.groupAdmin.deleteGroupAdmin(input.groupId, input.adminId);
      const group = await context.group.getById(input.groupId);
      return { group };
    },

    async customerCardTokenSave(root, { customerCardTokenInput }, context) {
      const inputWithCustomerId = assign(customerCardTokenInput, {
        customerId: context.auth.id,
        countryIsoCode: customerCardTokenInput.countryIsoCode || 'AE',
      });

      const country = await context.country.getByIsoCode(
        inputWithCustomerId.countryIsoCode
      );
      const dbConfig = await context.countryConfiguration.getByKey(
        countryConfigurationKeys.CARD_SAVE_PROVIDER,
        country.id
      );
      const countryActiveCardProvider = dbConfig.configurationValue;

      const id = await context.paymentService.saveCardToken(
        inputWithCustomerId,
        countryActiveCardProvider
      );
      return {
        customerCardToken: await context.customerCardToken.getById(id),
      };
    },

    async customerCardSaveWithRedirection(
      root,
      { customerCardTokenInput },
      context
    ) {
      const inputWithCustomerId = assign(customerCardTokenInput, {
        customerId: context.auth.id,
        countryIsoCode: customerCardTokenInput.countryIsoCode || 'AE',
      });
      const country = await context.country.getByIsoCode(
        inputWithCustomerId.countryIsoCode
      );
      const dbConfig = await context.countryConfiguration.getByKey(
        countryConfigurationKeys.CARD_SAVE_PROVIDER,
        country.id
      );
      const activePaymentProvider = dbConfig.configurationValue ||
        paymentProvider.CHECKOUT;

      return context.paymentService.saveCardTokenWithVerification(
        inputWithCustomerId,
        activePaymentProvider
      );
    },

    async customerCardTokenSetDefault(root, { id, isDefault }, context) {
      await context.paymentService.setDefaultCardToken({
        id,
        isDefault,
        customerId: context.auth.id,
      });
      return context.customerCardToken.getById(id);
    },

    async customerCardTokenDelete(root, { id }, context) {
      await context.paymentService.deleteCardToken({
        id,
        customerId: context.auth.id,
      });
      return true;
    },

    async resetAdminPassword(root, { adminId }, context) {
      const {
        admin,
        authProviderPassword,
        authenticationError,
        errors,
      } = await context.admin.resetPassword(adminId);

      return {
        admin,
        authProviderPassword,
        authenticationError,
        error: errors.length > 0 ? errors[0] : null,
        errors,
      };
    },
    importCities: (root, { file }, context) => {
      return file.then(async file => {
        // Check for initial validation errors
        const { errors } = await context.city.validateCSVFile(file);

        if (errors.length > 0) {
          return formatError(errors, file);
        }
        //  Contents of Upload scalar: https://github.com/jaydenseric/graphql-upload#class-graphqlupload
        //  file.stream is a node stream that contains the contents of the uploaded file
        //  node stream api: https://nodejs.org/api/stream.html
        const {
          serverErrors,
          serverErrorDescription,
        } = await context.city.importCities(file);
        return {
          error: serverErrors.length > 0 ? serverErrors[0] : null,
          errors: serverErrors,
          errorDescription: serverErrorDescription,
        };
      });
    },
    importNeighborhoods: (root, { file }, context) => {
      return file.then(async file => {
        // Check for initial validation errors
        const { errors } = await context.neighborhood.validateCSVFile(file);

        if (errors.length > 0) {
          return formatError(errors, file);
        }
        //  Contents of Upload scalar: https://github.com/jaydenseric/graphql-upload#class-graphqlupload
        //  file.stream is a node stream that contains the contents of the uploaded file
        //  node stream api: https://nodejs.org/api/stream.html
        const {
          serverErrors,
          serverErrorDescription,
        } = await context.neighborhood.importNeighborhoods(file);
        return {
          error: serverErrors.length > 0 ? serverErrors[0] : null,
          errors: serverErrors,
          errorDescription: serverErrorDescription,
        };
      });
    },
    importBrandSubscription: async (root, { file, url }, context) => {
      let response = {
        error: importBrandSubscriptionModelError.MISSING_PARAMETERS,
        errors: [importBrandSubscriptionModelError.MISSING_PARAMETERS],
        errorDescription: null,
      };
      if (file) {
        response = await context.brandSubscriptionModel.importBrandSubscriptionsByFile(
          file
        );
      } else if (url) {
        response = await context.brandSubscriptionModel.importBrandSubscriptionsByS3(
          url
        );
      }
      return response;
    },
    redeemVoucher(root, { code }, context) {
      return context.withTransaction('coupon', 'redeem', code, context.auth.id);
    },
    async giftCardCollectionSave(root, { giftCardCollection }, context) {
      giftCardCollection = removeLocalizationField(giftCardCollection, 'name');
      const validationResult = await context.giftCardCollection.validate(giftCardCollection);
      if (validationResult.length > 0) {
        return formatError(validationResult, giftCardCollection);
      }
      const rsp = await context.giftCardCollection.save(giftCardCollection);
      return {
        giftCardCollection: addLocalizationField(
          await context.giftCardCollection.getById(rsp),
          'name'
        ),
      };
    },
    async giftCardTemplateSave(root, { giftCardTemplate }, context) {
      giftCardTemplate = removeLocalizationField(
        removeLocalizationField(giftCardTemplate, 'name'),
        'imageUrl'
      );
      if (!giftCardTemplate.id) {
        giftCardTemplate.purchasedCount = 0;
        giftCardTemplate.redeemedCount = 0;
      }
      const validationResult = await context.giftCardTemplate.validate(
        giftCardTemplate
      );

      if (validationResult.length > 0) {
        return formatError(validationResult, giftCardTemplate);
      }
      const rsp = await context.withTransaction(
        'giftCardTemplate',
        'save',
        giftCardTemplate
      );
      // const rsp = await context.giftCardTemplate.save(giftCardTemplate);
      return {
        giftCardTemplate: addLocalizationField(
          addLocalizationField(
            await context.giftCardTemplate.getById(rsp),
            'name'
          ),
          'imageUrl'
        ),
      };
    },
    async redeemGiftCard(root, { code }, context) {
      const giftCard = await context.giftCard.getByShortCode(code);

      const result = await context.giftCard.redeem(code, context.auth.id);
      if (result.error)
        return {
          redeemed: false,
          ...formatError(result, { code, customerId: context.auth.id }),
        };

      return {
        redeemed: true,
        giftCard: addLocalizationField(
          addLocalizationField(
            await context.giftCard.getById(giftCard.id),
            'imageUrl'
          ),
          'name'
        ),
      };
    },
    async storeHeaderSave(root, { storeHeaderInput }, context) {
      const input = removeLocalizationField(storeHeaderInput, 'image');
      const validationResult = await context.storeHeader.validate(input);

      if (validationResult.length > 0) {
        return formatError(validationResult, input);
      }
      const result = await context.storeHeader.save(input);

      return {
        storeHeader: context.storeHeader.getById(result, true),
      };
    },
    async storeHeaderDelete(root, { id }, context) {
      const deleted = await context.storeHeader.deleteById(id);
      return Boolean(deleted);
    },
    async storeHeadersSorting(root, { ids }, context) {
      const sorted = await context.withTransaction(
        'storeHeader',
        'sortStoreHeaders',
        ids
      );
      return {
        sorted,
      };
    },
    async productSave(root, { input }, context) {
      const validationResult = await context.product.validate(input);

      if (validationResult.length > 0) {
        return formatError(validationResult, input);
      }

      const auth = context.auth;
      const admin = await context.admin.getByAuthoId(auth.id);
      if (!admin) {
        return;
      }
      if (!context.auth.isVendorAdmin) {
        const permission = await context.orderSet.validatePermissiosByPermission('product:upsert');
        if (!permission) {
          return;
        }
      } else {
        const brandAdminList = await context.brandAdmin.getByAdminId(admin.id);
        const brandAdmin = first(brandAdminList);
        if (!(input.brandId && brandAdmin && !brandAdmin.brandLocationId && brandAdmin.brandId === input.brandId)) {
          // [attack_scope]
          return;
        }
      }
      const result = await context.withTransaction('product', 'save', input);
      if (result.error) {
        return formatError(result, input);
      }
      const adminActivityLog = await getAuthUser(context);
      await context.kinesisLogger.sendLogEvent(
        { ...adminActivityLog, prosuct: input },
        kinesisAdminEventTypes.productSaveAdminEvent,
        'Admin'
      );

      const product = await context.product.getById(result, true);

      return {
        product,
      };
    },
    async productsSorting(root, { ids }, context) {
      const response = await context.withTransaction(
        'product',
        'sortProducts',
        ids
      );
      return response;
    },
    /*async productCategoriesSave(root, { productId, categoryIds }, context) {
      const result = await context.product.productCategoriesSave(
        productId,
        categoryIds
      );
      if (result.error) {
        return formatError(result, { productId, categoryIds });
      }
      const product = await context.product.getById(result, true);

      return {
        product,
      };
    },*/
    async productImagesSave(root, { productId, imageInputs }, context) {
      const auth = context.auth;
      const admin = await context.admin.getByAuthoId(auth.id);
      let hasPermission = false;
      if (admin) {
        if (auth.isVendorAdmin) {
          const product = await context.product.getById(productId);
          if (product && auth.isBrandAdmin(product.brandId)) {
            hasPermission = true;
          }
        } else {
          context.checkPermission('product:upsert', 'productImagesSave');
          hasPermission = true;
        }
      }
      if (!hasPermission) return; // [attack_scope]
      const result = await context.product.productImagesSave(
        productId,
        imageInputs
      );
      if (result.error) {
        return formatError(result, { productId, imageInputs });
      }
      const product = await context.product.getById(result, true);

      return {
        product,
      };
    },
    async productImagesSorting(root, { ids }, context) {
      const sorted = await context.withTransaction(
        'productImage',
        'sortProductImages',
        ids
      );
      return {
        sorted,
      };
    },
    async productImageDelete(root, { id }, context) {
      const auth = context.auth;
      const admin = await context.admin.getByAuthoId(auth.id);
      let hasPermission = false;
      if (admin) {
        if (auth.isVendorAdmin) {
          const productImage = await context.productImage.getById(id);
          const product = productImage ? await context.product.getById(productImage.productId) : null;
          if (product && auth.isBrandAdmin(product.brandId)) {
            hasPermission = true;
          }
        } else hasPermission = true;
      }
      if (!hasPermission) return; // [attack_scope]
      const deleted = await context.productImage.deleteById(id);
      return Boolean(deleted);
    },
    async pickupLocationSave(root, { pickupLocationInput }, context) {
      const result = await context.pickupLocation.save(pickupLocationInput);
      if (result.errors) {
        return formatError(result.errors, { pickupLocationInput });
      }
      const pickupLocation = await context.pickupLocation.getById(result);

      return {
        pickupLocation,
      };
    },
    async pickupLocationDelete(root, { id }, context) {
      const deleted = await context.pickupLocation.deleteById(id);
      return Boolean(deleted);
    },
    /*async inventoriesSave(root, { productId, inventoryInputs }, context) {
      const result = await context.product.productInventoriesSave(
        productId,
        inventoryInputs
      );
      if (result.errors) {
        return formatError(result.errors, { productId, inventoryInputs });
      }
      const product = await context.product.getById(productId, true);

      return {
        product,
      };
    },*/
    async shippingPolicySave(root, { shippingPolicyInput }, context) {
      const result = await context.shippingPolicy.save(shippingPolicyInput);
      if (result.errors) {
        return formatError(result.errors, { shippingPolicyInput });
      }
      const shippingPolicy = await context.shippingPolicy.getById(result);

      return {
        shippingPolicy,
      };
    },
    async shippingPolicyDelete(root, { id }, context) {
      const deleted = await context.shippingPolicy.deleteById(id);
      return Boolean(deleted);
    },
    /*async returnPolicySave(root, { productId, returnPolicyInput }, context) {
      const result = await context.product.productReturnPolicySave(
        productId,
        returnPolicyInput
      );
      if (result.errors) {
        return formatError(result.errors, { productId, returnPolicyInput });
      }

      const product = await context.product.getById(productId, true);

      return {
        product,
      };
    },*/
    async returnPolicyDelete(root, { id }, context) {
      const deleted = await context.returnPolicy.deleteById(id);
      return Boolean(deleted);
    },
    async signupPromoCreate(root, { input }, context) {
      // Check for initial validation errors
      input.currencyCode = input.currencyCode.toUpperCase();
      input.countryCode = input.countryCode.toUpperCase();
      const validationResult = await context.signupPromo.validateCreate(input);

      if (validationResult.length > 0) {
        return formatError(validationResult, input);
      }

      return {
        signupPromo: await context.signupPromo.create(input),
      };
    },
    async signupPromoUpdate(root, { input }, context) {
      // Check for initial validation errors
      const validationResult = await context.signupPromo.validateUpdate(input);

      if (validationResult.length > 0) {
        return formatError(validationResult, input);
      }

      return {
        signupPromo: await context.signupPromo.update(input),
      };
    },
    async setStoreOrderStatus(root, { storeOrderId, status }, context) {
      const auth = context.auth;
      const admin = await context.admin.getByAuthoId(auth.id);
      let hasPermission = false;
      /**
       * Logic
       * is Admin?
       * => is Admin Portal Admin => true
       * => is Vendor Admin?
       *    => is Brand Admin? => true
       *    => is Branch Admin? => false
       */
      if (admin) {
        const isVendorAdmin = auth.roles.includes('CSE');
        if (isVendorAdmin) {
          const brandAdminList = await context.brandAdmin.getByAdminId(admin.id);
          const storeOrder = await context.storeOrder.getById(storeOrderId);
          if (storeOrder && brandAdminList.length > 0) {
            hasPermission = findIndex(brandAdminList, brandAdmin => {
              return brandAdmin.brandId === storeOrder.brandId && brandAdmin.brandLocationId === null;
            }) > -1;
          }
        } else hasPermission = true;
      }
      if (!hasPermission) return; // [attack_scope]
      const validationResult = await context.storeOrderStatus.validate({
        storeOrderId,
        status,
      });
      if (validationResult.length > 0) return formatError(validationResult);

      const statusId = await context.storeOrderStatus.setStatus(
        storeOrderId,
        status,
        context
      );

      await publishStoreOrderSubscriptionEvent(
        context,
        storeOrderId,
        storeOrderSubscriptionEvent.STORE_ORDER_UPDATED
      );
      return { storeOrderStatus: context.storeOrderStatus.getById(statusId) };
    },
    async storeOrderAcknowledge(root, { storeOrder }, context) {
      const auth = context.auth;
      const admin = await context.admin.getByAuthoId(auth.id);
      let hasPermission = false;
      /**
       * Logic
       * is Admin?
       * => is Admin Portal Admin => true
       * => is Vendor Admin?
       *    => is Brand Admin? => true
       *    => is Branch Admin? => false
       */
      if (admin) {
        const isVendorAdmin = auth.roles.includes('CSE');
        if (isVendorAdmin) {
          const brandAdminList = await context.brandAdmin.getByAdminId(admin.id);
          const storeOrderInfo = await context.storeOrder.getById(storeOrder.id);
          if (storeOrderInfo && brandAdminList.length > 0) {
            hasPermission = findIndex(brandAdminList, brandAdmin => {
              return brandAdmin.brandId === storeOrderInfo.brandId && brandAdmin.brandLocationId === null;
            }) > -1;
          }
        } else hasPermission = true;
      }
      if (!hasPermission) return; // [attack_scope]
      const validationResult = await context.storeOrder.validate(storeOrder);
      if (validationResult.length > 0)
        return formatError(validationResult, storeOrder);

      const storeOrderId = await context.storeOrder.setAcknowledged(
        storeOrder.id
      );
      await publishStoreOrderSubscriptionEvent(
        context,
        storeOrderId,
        storeOrderSubscriptionEvent.STORE_ORDER_UPDATED
      );
      return {
        orderSet: context.storeOrder.getById(storeOrderId),
      };
    },
    async storeOrderTrackingInfoSave(root, { storeOrderId, input }, context) {
      const auth = context.auth;
      const admin = await context.admin.getByAuthoId(auth.id);
      let hasPermission = false;
      /**
       * Logic
       * is Admin?
       * => is Admin Portal Admin => true
       * => is Vendor Admin?
       *    => is Brand Admin? => true
       *    => is Branch Admin? => false
       */
      if (admin) {
        const isVendorAdmin = auth.roles.includes('CSE');
        if (isVendorAdmin) {
          const brandAdminList = await context.brandAdmin.getByAdminId(admin.id);
          const storeOrder = await context.storeOrder.getById(storeOrderId);
          if (storeOrder && brandAdminList.length > 0) {
            hasPermission = findIndex(brandAdminList, brandAdmin => {
              return brandAdmin.brandId === storeOrder.brandId && brandAdmin.brandLocationId === null;
            }) > -1;
          }
        } else hasPermission = true;
      }
      if (!hasPermission) return; // [attack_scope]
      const trackingInfoInput = {
        ...input,
        orderType: paymentStatusOrderType.STORE_ORDER,
        referenceId: storeOrderId,
      };
      const validationResult = await context.storeOrder.validateTrackingInfo(
        trackingInfoInput
      );
      if (validationResult.length > 0) {
        return formatError(validationResult, trackingInfoInput);
      }

      const trackInfoId = await context.trackingInfo.save(trackingInfoInput);

      return {
        trackingInfo: context.trackingInfo.getById(trackInfoId),
      };
    },
    async customerGroupSave(root, { input }, context) {
      // Check for initial validation errors
      const validationResult = await context.customerGroup.validate(input);

      if (validationResult.length > 0) {
        return formatError(validationResult, input);
      }

      const { customerGroupId, errors = [] } = await context.customerGroup.save(
        input
      );

      return {
        customerGroup:
          errors.length === 0
            ? await context.customerGroup.getById(customerGroupId)
            : null,
        errors,
        error: errors.length > 0 ? errors[0] : null,
      };
    },
    async addCreditsForCustomers(root, { input }, context) {
      const inputWithAuthId = assign(input, {
        userId: context.auth.id,
      });

      // Check for initial validation errors
      const validationResult = await context.loyaltyTransaction.validateAddCreditsForCustomers(
        inputWithAuthId
      );

      if (validationResult.length > 0) {
        return formatError(validationResult, inputWithAuthId);
      }

      const {
        customers,
        errors = [],
      } = await context.loyaltyTransaction.addCreditsForCustomers(
        inputWithAuthId
      );

      return {
        customers,
        errors,
        error: errors.length > 0 ? errors[0] : null,
      };
    },
    async importBranchContacts(root, { input }, context) {
      const inputWithAuthId = assign(input, {
        userId: context.auth.id,
      });

      // Check for initial validation errors
      const validationResult = await context.brandLocation.validateBranchContacInformation(
        inputWithAuthId
      );

      if (validationResult.length > 0) {
        return formatError(validationResult, inputWithAuthId);
      }

      const {
        branches,
        errors = [],
      } = await context.brandLocation.importBranchContacts(inputWithAuthId);

      return {
        branches,
        errors,
        error: errors.length > 0 ? errors[0] : null,
      };
    },
    async customerCurrentLocationSave(root, { input }, context) {
      const inputWithCustomerId = assign(input, {
        customerId: context.auth.id,
        srcPlatform: context.req.xAppOs || null,
        srcPlatformVersion: context.req.xAppVersion || null,
      });

      const result = await context.customerCurrentLocationCache.save(
        inputWithCustomerId
      );
      return result;
    },
    async storeOrderSetCreate(root, { input }, context) {
      const orderWithCustomerId = assign(input, {
        customerId: context.auth.id,
        srcPlatform: context.req.xAppOs || null,
        srcPlatformVersion: context.req.xAppVersion || null,
      });
      // Check for initial validation errors
      const validationResult = await context.storeOrderSet.validateOrder(
        orderWithCustomerId
      );

      if (validationResult.length > 0)
        return formatError(validationResult, input);

      const result = await context.withTransaction(
        'storeOrderSet',
        'storeOrderSetCreate',
        orderWithCustomerId
      );
      if (result.error) return formatError(result, orderWithCustomerId);

      if (result.paymentStatus === paymentStatusName.PAYMENT_SUCCESS) {
        // If payment was set to success, then publish the order
        await context.storeOrderSet.publishNewStoreOrderSet(
          context,
          result.storeOrderSet.id
        );
      }

      return {
        storeOrderSet: result.storeOrderSet,
        paymentUrl: result.paymentUrl,
      };
    },
    async giftCardsGenerate(root, params, context) {
      if (params.sk !== 'RG1izib7vec4KQ9vrfOJPW246cagzx') {
        return [];
      }
      const result = await context.withTransaction(
        'giftCard',
        'generateGiftCard',
        params
      );
      return result;
    },
    async getNewAccessToken(_, { refreshToken }, context) {
      const { token } = await context.internalAuthService.refreshToken(
        refreshToken
      );
      return token;
    },
    async subscribeBranch(_, { branchId, subscriptionToken }, context) {
      console.log('Context Auth : ', context.auth);
      // check if the admin has the same branch of orderSet
      // [attack_scope]
      const id = context.auth.id;
      if (!id) {
        return;
      }
      const admin = await context.admin.getByAuthoId(id);
      const brandAdminList = await context.brandAdmin.getByAdminId(admin.id);
      if (!admin || !branchId || brandAdminList.length == 0) {
        return;
      }
      const brandOfBranch = await context.brand.getByBrandLocation(branchId);
      for (const brand of brandAdminList) {
        if (!brand.brandLocationId) {
          if (brand.brandId != brandOfBranch.id) {
            return;
          }
        } else {
          const branchIds = brandAdminList.map((item) => item.brandLocationId);
          if (!branchIds.includes(branchId)) {
            return;
          }
        }
      }


      const validationResult = await context.adminBranchSubscription.validate(branchId);
      if (validationResult.length > 0) return formatError(validationResult);

      return {
        subscriptionId: context.adminBranchSubscription.save({
          adminId: context.auth.id || context.auth.uid,
          branchId,
          subscriptionToken,
        })
      };
    },
    async unsubscribeBranch(_, { branchId }, context) {
      // check if the admin has the same branch of orderSet
      // [attack_scope]
      const id = context.auth.id;
      if (!id) {
        return;
      }
      const admin = await context.admin.getByAuthoId(id);
      const brandAdminList = await context.brandAdmin.getByAdminId(admin.id);
      if (!admin || !branchId || brandAdminList.length == 0) {
        return;
      }
      const brandOfBranch = await context.brand.getByBrandLocation(branchId);
      for (const brand of brandAdminList) {
        if (!brand.brandLocationId) {
          if (brand.brandId != brandOfBranch.id) {
            return;
          }
        } else {
          const branchIds = brandAdminList.map((item) => item.brandLocationId);
          if (!branchIds.includes(branchId)) {
            return;
          }
        }
      }

      const validationResult = await context.adminBranchSubscription.validate(branchId);
      if (validationResult.length > 0) return formatError(validationResult);

      const result = await context.adminBranchSubscription.deleteByAdminAndBranchId(
        context.auth.id || context.auth.uid,
        branchId
      );

      return { status: result > 0 };
    },
    async blogCategoryCreate(root, { blogCategoryInput }, context) {
      const blogCategoryId = await context.blogCategory.save(blogCategoryInput);
      return context.blogCategory.getById(blogCategoryId);
    },
    async blogCategoryUpdate(root, { blogCategoryInput }, context) {
      const blogCategoryId = await context.blogCategory.save(blogCategoryInput);
      return context.blogCategory.getById(blogCategoryId);
    },
    async blogCategoryDelete(root, { id }, context) {
      const deleted = await context.blogCategory.deleteById(id);
      return Boolean(deleted);
    },
    async blogPostCreate(root, { blogPostInput }, context) {
      const blogPostId = await context.blogPost.save(blogPostInput);
      return context.blogPost.getById(blogPostId);
    },
    async blogPostUpdate(root, { blogPostInput }, context) {
      const blogPostId = await context.blogPost.save(blogPostInput);
      return context.blogPost.getById(blogPostId);
    },
    async blogPostDelete(root, { id }, context) {
      const deleted = await context.blogPost.deleteById(id);
      return Boolean(deleted);
    },
    async saveNewBrands(root, { countryId, newBrands }, context) {
      const validationResult = await context.newBrands.validate(
        countryId,
        newBrands
      );

      if (validationResult.length > 0) {
        return formatError(validationResult, newBrands);
      }

      await context.newBrands.save(countryId, newBrands);
      return {
        newBrands: context.newBrands.getListByCountryForAdminPortal({
          countryId,
        }),
      };
    },
    async saveBrandSubscriptionModel(root, { input }, context) {
      const validationResult = await context.brandSubscriptionModel.validate(
        input
      );
      if (validationResult) {
        const { errors } = validationResult;
        if (errors && errors.length > 0) {
          return formatError(validationResult, input);
        }
      }

      const id = await context.brandSubscriptionModel.addBrandSubscription(
        await context.brandSubscriptionModel.createInput(input)
      );

      if (id) {
        try {
          await context.userActivityLog.create({
            streamId: id,
            stream: streams.BRAND_SUBSCRIPTION_MODEL,
            action: input.id ? streamActions.UPDATE : streamActions.CREATE,
          });
        } catch (err) { }
      }

      return {
        brandSubscriptionModel: context.brandSubscriptionModel.getById(id),
      };
    },
    async customerNotificationUpdate(root, { notification }, context) {
      const customerWithId = assign(
        { notificationSettings: notification },
        { id: context.auth.id }
      );
      const validationResult = await context.customer.validateNotificationUpdate(
        customerWithId
      );
      if (validationResult.length > 0)
        return formatError(validationResult, customerWithId);
      await context.customer.update(customerWithId);
      const changedCustomer = await context.customer.getById(customerWithId.id);
      return { customer: changedCustomer };
    },

    async pairDeviceWithBrandLocation(
      root,
      { brandLocationId, deviceCode },
      context
    ) {
      const validationResult = await context.brandLocationDevice.isValidDeviceCode(
        { code: deviceCode, brandLocationId }
      );
      if (validationResult.length > 0) return formatError(validationResult);
      const device = await context.brandLocationDevice.pairDeviceWithBrandLocation(
        { code: deviceCode, brandLocationId }
      );
      return { id: device.id, deviceId: device.deviceId };
    },

    async unpairDeviceWithBrandLocation(
      root,
      { brandLocationId, deviceId },
      context
    ) {
      const validationResult = await context.brandLocationDevice.isValidDeviceForUnpairing(
        { deviceId, brandLocationId }
      );
      if (validationResult.length > 0) return formatError(validationResult);
      const device = await context.brandLocationDevice.unpairDeviceWithBrandLocation(
        { deviceId, brandLocationId }
      );
      return { id: device.id, deviceId: device.deviceId };
    },
    reportMyFatoorahApplePayPaymentFailure(_, { orderId, paymentId }, context) {
      // this log was added for the ApplePay payments doing with MyFatoorah,
      // because MyFatoorah ApplePay payments does not executed in our backend,
      // TODO: we will decide what we can do for this kind of situation
      // ex: we can create zendesk ticket automatically, or we can check
      // order status manually.
      SlackWebHookManager
        .sendSlackMessage(
          `Waiting after Apple Pay took 5 seconds.
                       Orderid: ${orderId} Payment id: ${paymentId}`
        )
        .catch(err => console.log({
          place: 'reportMyFatoorahApplePayPaymentFailure.sendSlackMessage',
          err,
          paymentId,
          orderId
        }));
      return {
        status: 'SUCCESS',
        message: 'Related payment issue logged!'
      };
    },
    // we already have payment-callback ends as REST API in routes
    // but IOS Developers wanted to use graphql endpoint for the ApplePay
    // this function was created to process any payment from myfatoorah
    // it is clone code from mf payment-callback in routes
    async myFatoorahPaymentCallback(_, args, context) {
      const { paymentId, invoiceId, currencyCode, countryCode } = args;
      if (!paymentId && !invoiceId) {
        const message = 'mobile is failed to provide required parameters. ' +
          'there must be one of paymentId or invoiceId';
        SlackWebHookManager.sendTextToSlack(`
          myFatoorahPaymentCallback couldn't do its job
          because of wrong parameters!
          parameters -> ${JSON.stringify(args)}
          err -> ${message}
          place -> src/schema/mutation/resolvers.js:3024
        `).catch(err => console.log({
          place: 'src/schema/mutation/resolvers.js:3024',
          err: JSON.stringify(err)
        }));
        return { status: 'ERROR', message };
      }

      const psResponse = await mf.paymentEnquiry(context.db, {
        id: paymentId || invoiceId,
        type: paymentId ? 'PaymentId' : 'InvoiceId',
        currencyCode,
        countryCode,
      });

      if (psResponse.orderType === 'ECOM') {
        await axiosAdapter.send({
          path: `${ecommerce.paymentMfCallback}?cko-session-id=${paymentId}&countryCode=${countryCode}`,
          method: 'POST',
          params: psResponse,
        });

        return {
          status: 'SUCCESS',
          paymentStatus: psResponse.paymentStatus,
          message: 'payment was processed successfully'
        };
      }

      psResponse.myFatoorahPaymentId = psResponse.id;
      delete psResponse.id;

      if (psResponse.error) {
        await context.kinesisLogger.sendLogEvent(
          {
            countryCode,
            currencyCode,
            paymentId,
            paymentResponse: psResponse,
          },
          kinesisEventTypes.myFatoorahPaymentCallbackEvent
        );
        return { status: 'ERROR', message: JSON.stringify(psResponse.error) };
      }

      const modelName = getModelNameByType(psResponse.orderType);

      const resolvedPayment = await context[
        modelName
      ].resolvePaymentCallback(psResponse);
      await context.kinesisLogger.sendLogEvent(
        {
          countryCode,
          currencyCode,
          paymentId,
          paymentResponse: psResponse,
          resolvedPayment,
        },
        kinesisEventTypes.myFatoorahPaymentCallbackEvent
      );
      return {
        status: 'SUCCESS',
        paymentStatus: psResponse.paymentStatus,
        message: 'payment was processed successfully'
      };
    },
    pickupLocationChangeStatus(root, { id, status }, context) {
      return context.pickupLocation.changeStatus(id, status);
    },
    async saveCustomerFavoriteBrandLocation(root, { input }, context) {
      const customerId = context.auth.id;
      const validationResult = await context.customerFavoriteBrandLocation.validateCustomerFavoriteBrandLocation(
        customerId,
        input.brandLocationId,
        true
      );
      if (validationResult.length > 0)
        return formatError(validationResult, customerId);

      await context.customerFavoriteBrandLocation.save(
        customerId,
        input.brandLocationId
      );

      return {
        customerFavoriteBrandLocations: context.customerFavoriteBrandLocation.getByCustomerId(
          customerId
        ),
      };
    },
    async deleteCustomerFavoriteBrandLocation(root, { input }, context) {
      const customerId = context.auth.id;
      const validationResult = await context.customerFavoriteBrandLocation.validateCustomerFavoriteBrandLocation(
        customerId,
        input.brandLocationId,
        false
      );
      if (validationResult.length > 0)
        return formatError(validationResult, customerId);

      const deleted = await context.customerFavoriteBrandLocation.deleteByCustomerIdAndBrandLocationId(
        customerId,
        input.brandLocationId
      );

      return { deleted: Boolean(deleted) };
    },
    async setNotificationCustomerForBrandLocationOpened(root, { brandLocationId }, context) {
      const customerId = context.auth.id;
      const { errors: validationResult, status } = await context.brandLocation.saveNotificationForBrandLocation(
        customerId,
        brandLocationId
      );
      if (validationResult.length > 0)
        return formatError(validationResult, customerId);

      return { status };
    },
    async deleteNotificationCustomerForBrandLocationOpened(root, { brandLocationId }, context) {
      const customerId = context.auth.id;
      const { errors: validationResult, status } = await context.brandLocation.deleteNotificationForBrandLocation(
        customerId,
        brandLocationId
      );
      if (validationResult.length > 0)
        return formatError(validationResult, customerId);

      return { status };
    },
    async saveOrderRating(root, { orderRating }, context) {
      const validationResult = await context.orderRating.validate(orderRating);
      if (validationResult.length > 0) {
        return formatError(validationResult, orderRating);
      }
      const orderSet = await context.orderSet.getById(orderRating.orderSetId);
      const customerId = context.auth.id;
      if (orderSet.customerId !== customerId) {
        return formatError(
          [saveOrderRatingError.NOT_MATCHED_CUSTOMER],
          orderRating
        );
      }
      const customer = await context.customer.getById(orderSet.customerId);
      const orderFulfillment = await context.orderFulfillment.getByOrderSet(
        orderRating.orderSetId
      );
      orderRating.brandLocationId = orderSet.brandLocationId;
      orderRating.customerId = orderSet.customerId;
      orderRating.customerName = customer.firstName;
      orderRating.fulfillmentType = orderFulfillment.type;
      const { brandName, branchName } = await context.orderRating.getBrandAndBranchName(null, orderRating.brandLocationId);
      // rateable:true -> no rating yet, it is coming, returns overall questions
      // rateable:false -> there is rating, it is done, returns fulfillment overall by fulfillment type
      const overallQuestions = await context.orderRatingQuestion.getOverallQuestion({ rateable: true, sqlLimit: 1 });
      const detail = {
        id: overallQuestions[0].id,
        question: context.orderRatingQuestion.getReplacedString(overallQuestions[0].question, brandName, branchName),
        description: context.orderRatingQuestion.getReplacedString(overallQuestions[0].description, brandName, branchName),
        answer: orderRating.rating,
        questionType: OrderRatingQuestionType.OVERALL,
      };
      orderRating.details = JSON.stringify([detail]);
      const id = await context.orderRating.save(orderRating);

      // if rating is smaller than 3, then zendesk ticket will be created automatically
      if (orderRating.rating < 3) {
        await context.orderRating.sendMessagesToSlack(orderRating.orderSetId, [detail]);
        let userEmail = context.auth.email;
        if (!userEmail) {
          const user = await context.customer.getById(customerId);
          userEmail = user && user.email;
        }
        await context.zendeskService.createZendeskTicket(
          orderRating.orderSetId,
          userEmail
        );
      }
      await context.orderSet.save({ id: orderRating.orderSetId, ratingStatus: OrderRatingStatus.RATED });
      return { orderRating: context.orderRating.getById(id), isOpenDetailScreen: (orderRating.rating <= 3) };
    },

    async saveOrderRatingDetail(root, { orderRatingDetail }, context) {
      const customerId = context.auth.id;
      const validationResult = await context.orderRating.validateDetail(
        orderRatingDetail,
        customerId
      );
      if (validationResult.length > 0) {
        return formatError(validationResult, orderRatingDetail);
      }
      const orderRating = await context.orderRating.updateOrderDetails(
        orderRatingDetail
      );
      return { orderRating };
    },

    async orderRatingQuestionSave(root, { question }, context) {
      question = removeLocalizationField(question, 'question');
      question = removeLocalizationField(question, 'description');
      const validationResult = await context.orderRatingQuestion.validate(
        question
      );

      if (validationResult.length > 0) {
        return formatError(validationResult, question);
      }
      const result = await context.orderRatingQuestion.save(question);
      const orderRatingQuestion = await context.orderRatingQuestion.getById(
        result
      );

      return {
        orderRatingQuestion: addLocalizationField(
          addLocalizationField(orderRatingQuestion, 'question'),
          'description'
        ),
      };
    },
  },
};
