/* eslint-disable camelcase */
const casual = require('casual');
const {
  countryConfigurationKeys,
  deliveryPartners,
} = require('../../../src/schema/root/enums');

module.exports = countries => {
  return [
    {
      id: casual.uuid,
      country_id: countries.kuwait.id,
      configuration_key: countryConfigurationKeys.REFERRAL_EXPIRY_PERIOD,
      configuration_value: '720', // 24 * 30 hours
      enabled: true,
    },
    {
      id: casual.uuid,
      country_id: countries.kuwait.id,
      configuration_key:
        countryConfigurationKeys.REFERRAL_RECEIVER_DISCOUNT_PERCENTAGE,
      configuration_value: 50,
      enabled: true,
    },
    {
      id: casual.uuid,
      country_id: countries.kuwait.id,
      configuration_key: countryConfigurationKeys.MAX_REFERRAL_DISCOUNT_LIMIT,
      configuration_value: 3,
      enabled: true,
    },
    {
      id: casual.uuid,
      country_id: countries.kuwait.id,
      configuration_key:
        countryConfigurationKeys.REFERRAL_REWARD_ON_FIRST_X_ORDERS,
      configuration_value: 3,
      enabled: true,
    },
    {
      id: casual.uuid,
      country_id: countries.kuwait.id,
      configuration_key: countryConfigurationKeys.REFERRAL_RECEIVER_PROMO_LEVEL,
      configuration_value: 'COFE',
      enabled: true,
    },
    {
      id: casual.uuid,
      country_id: countries.kuwait.id,
      configuration_key:
        countryConfigurationKeys.REFERRAL_RECEIVER_PROMO_X_ORDERD_PER_BRAND,
      configuration_value: 0,
      enabled: true,
    },
    {
      id: casual.uuid,
      country_id: countries.kuwait.id,
      configuration_key: countryConfigurationKeys.BLOCK_CASH_ON_DELIVERY,
      configuration_value: true,
      enabled: true,
    },
    {
      id: casual.uuid,
      country_id: countries.kuwait.id,
      configuration_key:
        countryConfigurationKeys.AUTOMATIC_DELIVERY_INTEGRATION,
      configuration_value: 'true',
      enabled: true,
    },
    {
      id: casual.uuid,
      country_id: countries.kuwait.id,
      configuration_key: countryConfigurationKeys.DELIVERY_PARTNER,
      configuration_value: deliveryPartners.MASHKOR,
      enabled: true,
    },
    {
      id: casual.uuid,
      country_id: countries.kuwait.id,
      configuration_key: countryConfigurationKeys.DISCOVERY_CREDITS_ENABLE,
      configuration_value: 'false',
      enabled: true,
    },
    {
      id: casual.uuid,
      country_id: countries.kuwait.id,
      configuration_key: countryConfigurationKeys.DISCOVERY_CREDITS,
      configuration_value: 0,
      enabled: true,
    },
    {
      id: casual.uuid,
      country_id: countries.kuwait.id,
      configuration_key:
        countryConfigurationKeys.DISCOVERY_CREDITS_CONSUMEABLE_PER_ORDER,
      configuration_value: 0,
      enabled: true,
    },
    {
      id: casual.uuid,
      country_id: countries.kuwait.id,
      configuration_key:
        countryConfigurationKeys.DISCOVERY_CREDITS_X_ORDERS_PER_BRAND,
      configuration_value: 0,
      enabled: true,
    },
    {
      id: casual.uuid,
      country_id: countries.kuwait.id,
      configuration_key:
        countryConfigurationKeys.DISCOVERY_CREDITS_MIN_ORDER_AMOUNT,
      configuration_value: 0,
      enabled: true,
    },
    {
      id: casual.uuid,
      country_id: countries.kuwait.id,
      configuration_key:
        countryConfigurationKeys.DISCOVERY_CREDITS_EXPIRES_IN_DAYS,
      configuration_value: 0,
      enabled: true,
    },
    {
      id: casual.uuid,
      country_id: countries.kuwait.id,
      configuration_key: countryConfigurationKeys.DISCOVERY_CREDITS_EXPIRY_DATE,
      configuration_value: 0,
      enabled: true,
    },
    {
      id: casual.uuid,
      country_id: countries.kuwait.id,
      configuration_key: countryConfigurationKeys.COFE_STORE_ENABLED,
      configuration_value: 'true',
      enabled: true,
    },
    {
      id: casual.uuid,
      country_id: countries.kuwait.id,
      configuration_key:
        countryConfigurationKeys.SUBSCRIPTION_ENABLE,
      configuration_value: 'true',
      enabled: true,
    },
  ];
};
