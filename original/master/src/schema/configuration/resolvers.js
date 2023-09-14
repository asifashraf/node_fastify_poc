const { get, filter, split, constant } = require('lodash');
const {
  googleMapsApiKey,
  googleMapsReverseGeocodeApiKey,
  cloudinary,
  loyaltyTierConfig,
  loyaltyTopUpSku,
  tabbyApiKey,
} = require('../../../config');
const { addLocalizationField } = require('../../lib/util');
const { encrypt } = require('../../lib/encryption');
module.exports = {
  Configuration: {
    async neighborhoods(id, args, context) {
      return addLocalizationField(await context.neighborhood.getAll(), 'name');
    },
    cofeDistrictHours(id, args, context) {
      return context.weeklySchedule.getForCofeDistrict();
    },
    availableDeliveryAreas(config) {
      return filter(
        split(get(config, 'availableDeliveryAreas', ''), ','),
        item => item !== ''
      );
    },
    towers(root, args, context) {
      return context.tower.getAll();
    },
    loyaltyTiers: constant(loyaltyTierConfig),
    loyaltyTopUpSku: constant(loyaltyTopUpSku),
    async defaultCountry(root, args, context) {
      return context.configuration.getDefaultCountry(root);
    },
    googleMapsApiKey() {
      return googleMapsApiKey;
    },
    googleMapsReverseGeocodeApiKey() {
      return googleMapsReverseGeocodeApiKey;
    },
    googleMapsApiKeyEncrypted() {
      return encrypt(googleMapsApiKey);
    },
    googleMapsReverseGeocodeApiKeyEncrypted() {
      return encrypt(googleMapsReverseGeocodeApiKey);
    },
    cloudinaryApiKeyEncrypted() {
      return encrypt(cloudinary.apiKey);
    },
    cloudinaryApiSecretEncrypted() {
      return encrypt(cloudinary.apiSecret);
    },
    tabbyApiKey() {
      return tabbyApiKey;
    }
  },
};
