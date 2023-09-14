/* eslint-disable camelcase */
const moment = require('moment');
const {
  giftCardCollectionStatus,
} = require('./../../../src/schema/root/enums');
module.exports = () => {
  return {
    gift_card_collection1: {
      id: 'cc451fc7-3627-4bdd-bcab-c32b20568924',
      name: 'gift card collection 1',
      name_ar: 'gift card collection 1 ar',
      country_id: '01c73b60-2c6a-45f1-8dbf-88a5ce4ad179',
      status: giftCardCollectionStatus.INACTIVE,
      created: moment('2018-01-05T12:00:00+01:00').toISOString(),
      updated: moment('2018-01-05T12:00:00+01:00').toISOString(),
    },
    gift_card_collection2: {
      id: 'cc451fc7-3627-4bdd-bcab-c32b20568925',
      name: 'gift card collection 2',
      name_ar: 'gift card collection 2 ar',
      country_id: '01c73b60-2c6a-45f1-8dbf-88a5ce4ad179',
      status: giftCardCollectionStatus.ACTIVE,
      created: moment('2018-01-05T12:00:00+01:00').toISOString(),
      updated: moment('2018-01-05T12:00:00+01:00').toISOString(),
    },
    gift_card_collection3: {
      id: 'cc451fc7-3627-4bdd-bcab-c32b20568926',
      name: 'gift card collection 3',
      name_ar: 'gift card collection 3 ar',
      country_id: '01c73b60-2c6a-45f1-8dbf-88a5ce4ad179',
      status: giftCardCollectionStatus.INTERNAL,
      created: moment('2018-01-05T12:00:00+01:00').toISOString(),
      updated: moment('2018-01-05T12:00:00+01:00').toISOString(),
    },
  };
};
