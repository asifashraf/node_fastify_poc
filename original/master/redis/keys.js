const { template } = require('lodash');

const keys = {};

keys.brandLocationMenuWithPatternKey = template(
  'menu:*:brandLocation:<%= brandLocationId %>'
);

keys.brandLocationMenuKey = template(
  'menu:<%= menuId %>:brandLocation:<%= brandLocationId %>'
);

keys.brandMenuKey = template(
  'menu:<%= menuId %>'
);

keys.locationsInRadiusKey = template(
  'inRadius:<%= geohash %>:params:<%= params %>'
);

keys.brandLocationOpeningsKey = template(
  'openings:<%= brandLocationId %>:params:<%= params %>'
);

keys.brandLocationStoreStatusKey = template(
  'fulfilmentAvailable:<%= brandLocationId %>:fulfilment:<%= fulfillment %>'
);

keys.countryCurrencyLookupKey = 'countryCurrencyLookup';

keys.loyaltyTiersKey = template('loyaltyTiers:<%= params %>');

keys.countryConfigsKey = 'countryConfigs';

keys.addressFieldsKey = template('addressFields:<%= params %>');

keys.sqlCacheKey = template('sqlCache:<%= sqlHash %>');

keys.countryConfigInfoByKey = template('countryConfigByKey:<%= key %>');

keys.arrivedMposOrderKey = template('arrivedOrder:<%= orderSetId %>');

keys.brandLocationStoreAvailabilityKeyByFulfillment = template(
  'fulfillmentAvailableNew:<%= brandLocationId %>:fulfillment:<%= fulfillment %>'
);

keys.expressDeliveryDriverTokenKey = template(
  'expressDeliveryOrder:<%= orderSetId %>:driverToken:<%= driverId %>'
);

keys.expressDeliveryAllDriverTokenKey = template(
  'expressDeliveryOrder:<%= orderSetId %>:driverToken:*'
);

module.exports = keys;
