const BaseModel = require('../../base-model');
const { includes, find, filter, pick, union, omit, map} = require('lodash');
const {
  paymentProviders,
} = require('../../payment-service/enums');
const {
  paymentMethodError,
  paymentMethodStatus,
  availablePaymentOption,
  paymentProviderEnum,
} = require('./enums');
const {
  uuid
} = require('../../lib/util');
const { createLoaders } = require('./loaders');
const ALL_METHODS = {
  'isApplePayEnable': paymentMethodError.APPLE_PAY_ALREADY_ENABLE_ANOTHER_PROVIDER,
  'isGooglePayEnable': paymentMethodError.GOOGLE_PAY_ALREADY_ENABLE_ANOTHER_PROVIDER,
  'isKnetEnable': paymentMethodError.KNET_ALREADY_ENABLE_ANOTHER_PROVIDER,
  'isVisaMasterEnable': paymentMethodError.VISA_MASTER_ALREADY_ENABLE_ANOTHER_PROVIDER,
  'isMadaEnable': paymentMethodError.MADA_ALREADY_ENABLE_ANOTHER_PROVIDER,
  'isStcEnable': paymentMethodError.STC_ALREADY_ENABLE_ANOTHER_PROVIDER,
  'isCardSavedEnable': paymentMethodError.CARD_SAVED_ALREADY_ENABLE_ANOTHER_PROVIDER
};
const SlackWebHookManager = require('../slack-webhook-manager/slack-webhook-manager');
const CARD_SAVED_DISABLED_COUNTRIES = ['KW'];

class PaymentMethod extends BaseModel {
  constructor(db, context) {
    super(db, 'payment_providers', context);
    this.loaders = createLoaders(this);
  }

  async validateProvider(input) {
    const errors = [];
    const paymentMethod = await super.getById(input.id);
    if (!paymentMethod) {
      errors.push(paymentMethodError.INVALID_PAYMENT_PROVIDER_ID);
    } else if (!includes(paymentProviders, paymentMethod.providerName)) {
      errors.push(paymentMethodError.UNDEFINED_PAYMENT_RROVIDER);
    }
    return errors;
  }

  async validatePaymentMethods(input) {
    let errors = [];
    const paymentProvider = await this.getById(input.paymentProviderId);
    if (paymentProvider) {
      if (paymentProvider.countryId !== input.countryId) {
        errors.push(paymentMethodError.COUNTRY_NOT_MATCHED_PAYMENT_PROVIDER);
      } else {
        switch (paymentProvider.providerName) {
          case 'CHECKOUT':
            errors = errors.concat(await this.validateCheckout(input));
            break;
          case 'MY_FATOORAH':
            errors = errors.concat(await this.validateMyFatoorah(input));
            break;
          case 'MOBILE_EXPRESS':
            errors = errors.concat(await this.validateMobileExpress(input));
            break;
        }
        if (errors.length > 0) return errors;
        const allPaymentMethods = await this.getPaymentMethodsForAdmin({countryId: input.countryId});
        const paymentMethod = find(allPaymentMethods, method => method.paymentProviderId === input.paymentProviderId);
        if (paymentMethod && (!input.id || (input.id && paymentMethod.id !== input.id))) {
          errors.push(paymentMethodError.PAYMENT_METHOD_ALREADY_EXIST_FOR_THIS_PROVIDER);
        } else if (!paymentMethod && input.id) {
          errors.push(paymentMethodError.INVALID_PAYMENT_METHOD_ID);
        } else if (paymentProvider.status === paymentMethodStatus.ACTIVE) {
          const allActivePaymentMethods = filter(allPaymentMethods, method => method.status === paymentMethodStatus.ACTIVE &&
            (!paymentMethod || method.paymentProviderId !== input.paymentProviderId)
          );

          if (allActivePaymentMethods.length > 0) {
            const allMethodKeys = Object.keys(ALL_METHODS);
            let activeMethodList = [];
            map(allActivePaymentMethods, pyMethod => {
              const mList = pick(pyMethod, allMethodKeys);
              activeMethodList = union(activeMethodList, Object.keys(mList).filter(item => mList[item]));
            });
            map(allMethodKeys, method => {
              if (input[method] && includes(activeMethodList, method)) errors.push(ALL_METHODS[method]);
            });
          }
        }
      }
    } else errors.push(paymentMethodError.INVALID_PAYMENT_PROVIDER);
    return errors;
  }

  async updateProviderStatus(input) {
    try {
      if (input.status === paymentMethodStatus.INACTIVE) {
        await this.db('payment_provider_countries')
          .where('payment_provider_id', input.id)
          .update({
            isApplePayEnable: false,
            isGooglePayEnable: false,
            isKnetEnable: false,
            isVisaMasterEnable: false,
            isAmexEnable: false,
            isMadaEnable: false,
            isStcEnable: false,
            isCardSavedEnable: false
          });
      }
      const paymentProviderId = await super.save(input);
      const paymentProvider = await this.getById(paymentProviderId);
      const country = await this.context.country.getById(paymentProvider.countryId);
      const auth = await this.context.auth;
      const info = { 'requesterId': auth.id, 'requesterEmail': auth.email};
      SlackWebHookManager.sendTextAndObjectToSlack(
        '[INFO] Payment Provider status is updated for ' + country.name.en + ' by: ' + JSON.stringify(info),
        {provider: paymentProvider.providerName, status: paymentProvider.status}
      );
      return paymentProvider;
    } catch (error) {
      return {errors: [paymentMethodError.TRANSACTIONAL_ERROR]};
    }
  }

  async saveMethods(input) {
    try {
      input = omit(input, ['countryId']);
      if (input.id) {
        await this.db('payment_provider_countries')
          .where('id', input.id)
          .update(input);
      } else {
        input.id = uuid.get();
        await this.db('payment_provider_countries').insert(input);
      }
      const paymentMethods = await this.getPaymentMethodsById(input.id);
      const country = await this.context.country.getById(paymentMethods.countryId);
      const auth = await this.context.auth;
      const info = { 'requesterId': auth.id, 'requesterEmail': auth.email};
      SlackWebHookManager.sendTextAndObjectToSlack(
        '[INFO] Payment Provider Methods is updated/inserted for ' + country.name.en + ' by: ' + JSON.stringify(info),
        {...input}
      );
      return paymentMethods;
    } catch (error) {
      return {errors: [paymentMethodError.TRANSACTIONAL_ERROR]};
    }
  }

  async getPaymentProviders({status, countryId}) {
    const query = this.roDb(this.tableName)
      .where('country_id', countryId);
    if (status) {
      query.where('status', status);
    }
    const paymentProviders = await query.select('*');
    return paymentProviders;
  }

  async getPaymentMethodsById(id) {
    const select = 'ppc.*, pp.status as provider_status, pp.provider_name, pp.country_id';
    const query = this.db('payment_provider_countries as ppc')
      .select(this.roDb.raw(select))
      .leftJoin('payment_providers as pp', 'pp.id', 'ppc.payment_provider_id')
      .where('ppc.id', id)
      .first();
    const paymentMethods = await query;
    return paymentMethods;
  }

  async getPaymentMethodsForAdmin({status, countryId}) {
    const select = 'ppc.*, pp.status as provider_status, pp.provider_name, pp.country_id';
    const query = this.db('payment_provider_countries as ppc')
      .select(this.roDb.raw(select))
      .leftJoin('payment_providers as pp', 'pp.id', 'ppc.payment_provider_id')
      .where('pp.country_id', countryId);
    if (status) {
      query.where('ppc.status', status);
    }
    const paymentMethods = await query;
    return paymentMethods;
  }

  async getPaymentProviderByCountryCode(countryCode) {
    const providerNames = await this.db('payment_providers as pp')
      .select('pp.provider_name')
      .leftJoin('countries as c', 'c.id', 'pp.country_id')
      .where('c.iso_code', countryCode)
      .where('pp.status', paymentMethodStatus.ACTIVE);
    if (providerNames.length > 0) {
      const paymentServices = [];
      for (const paymentService of providerNames) {
        paymentServices.push({
          paymentProvider: paymentService.providerName,
        });
      }
      return paymentServices;
    } else return [];
  }

  async getProviderPaymentMethodsByCountryCode(providerName, countryCode) {
    const select = 'ppc.*';
    const query = this.db('payment_provider_countries as ppc')
      .select(this.roDb.raw(select))
      .leftJoin('payment_providers as pp', 'pp.id', 'ppc.payment_provider_id')
      .leftJoin('countries as c', 'c.id', 'pp.country_id')
      .where('c.iso_code', countryCode)
      .where('pp.provider_name', providerName)
      .where('pp.status', paymentMethodStatus.ACTIVE)
      .where('ppc.status', paymentMethodStatus.ACTIVE)
      .first();
    const paymentMethods = await query;
    return paymentMethods;
  }

  async getById(id) {
    const query = this.roDb(this.tableName).where('id', id).first();
    return await query;
  }

  async getAvailablePaymentMethodOptionsForAdmin(countryId) {
    const country = await this.context.country.getById(countryId);
    if (country) {
      const select = 'pp.id as provider_id, pp.status, pp.provider_name, pp.country_id';
      const query = this.db('payment_providers as pp')
        .select(this.roDb.raw(select))
        .where('pp.country_id', country.id);
      const providers = await query;
      const options = [];
      map(providers, provider => {
        let availableOptions = [];
        switch (provider.providerName) {
          case 'CHECKOUT':
            availableOptions = [
              availablePaymentOption.APPLE_PAY,
              availablePaymentOption.GOOGLE_PAY,
              availablePaymentOption.VISA_MASTER,
              availablePaymentOption.AMEX
            ];
            if (!CARD_SAVED_DISABLED_COUNTRIES.includes(country.isoCode)) {
              availableOptions.push(availablePaymentOption.CARD_SAVED);
            }
            options.push({
              providerId: provider.providerId,
              provider: paymentProviderEnum.CHECKOUT,
              availableOptions
            });
            break;
          case 'MY_FATOORAH':
            availableOptions = [
              availablePaymentOption.APPLE_PAY,
              availablePaymentOption.GOOGLE_PAY,
              availablePaymentOption.KNET,
              availablePaymentOption.VISA_MASTER,
              availablePaymentOption.AMEX,
              availablePaymentOption.MADA,
              availablePaymentOption.STC
            ];
            if (!CARD_SAVED_DISABLED_COUNTRIES.includes(country.isoCode)) {
              availableOptions.push(availablePaymentOption.CARD_SAVED);
            }
            options.push({
              providerId: provider.providerId,
              provider: paymentProviderEnum.MY_FATOORAH,
              availableOptions
            });
            break;
          case 'MOBILE_EXPRESS':
            availableOptions = [
              availablePaymentOption.APPLE_PAY,
              availablePaymentOption.GOOGLE_PAY,
              availablePaymentOption.VISA_MASTER,
              availablePaymentOption.AMEX
            ];
            if (!CARD_SAVED_DISABLED_COUNTRIES.includes(country.isoCode)) {
              availableOptions.push(availablePaymentOption.CARD_SAVED);
            }
            options.push({
              providerId: provider.providerId,
              provider: paymentProviderEnum.MOBILE_EXPRESS,
              availableOptions
            });
            break;
        }
      });
      return options;
    }
    return [];
  }

  async validateCheckout(input) {
    const errors = [];
    if (input.isKnetEnable) errors.push(paymentMethodError.KNET_CAN_NOT_ENABLE_FOR_CHECKOUT_PROVIDER);
    if (input.isStcEnable) errors.push(paymentMethodError.STC_CAN_NOT_ENABLE_FOR_CHECKOUT_PROVIDER);
    if (input.isMadaEnable) errors.push(paymentMethodError.MADA_CAN_NOT_ENABLE_FOR_CHECKOUT_PROVIDER);
    if (input.isCardSavedEnable) {
      if (await this.validateSavedCard(input.countryId)) errors.push(paymentMethodError.CARD_SAVED_NOT_ENABLE_FOR_COUNTRY);
    }
    return errors;
  }

  async validateMyFatoorah(input) {
    const errors = [];
    if (input.isCardSavedEnable) errors.push(paymentMethodError.CARD_SAVED_CAN_NOT_ENABLE_FOR_MY_FATOORAH_PROVIDER);
    return errors;
  }

  async validateMobileExpress(input) {
    const errors = [];
    if (input.isKnetEnable) errors.push(paymentMethodError.KNET_CAN_NOT_ENABLE_FOR_MOBILE_EXPRESS_PROVIDER);
    if (input.isStcEnable) errors.push(paymentMethodError.STC_CAN_NOT_ENABLE_FOR_MOBILE_EXPRESS_PROVIDER);
    if (input.isMadaEnable) errors.push(paymentMethodError.MADA_CAN_NOT_ENABLE_FOR_MOBILE_EXPRESS_PROVIDER);
    if (input.isCardSavedEnable) {
      if (await this.validateSavedCard(input.countryId)) errors.push(paymentMethodError.CARD_SAVED_NOT_ENABLE_FOR_COUNTRY);
    }
    return errors;
  }

  async validateSavedCard(countryId) {
    const country = await this.context.country.getById(countryId);
    if (CARD_SAVED_DISABLED_COUNTRIES.includes(country.isoCode)) {
      return true;
    }
    return false;
  }
}

module.exports = PaymentMethod;
