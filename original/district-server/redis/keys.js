const { template } = require('lodash');

const keys = {};

keys.brandLocationMenuWithPatternKey = template(
  'menu:*:brandLocation:<%= brandLocationId %>'
);

keys.brandLocationMenuKey = template(
  'menu:<%= menuId %>:brandLocation:<%= brandLocationId %>'
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

keys.acceptedOrderSetKey = 'acceptedOrderSet:';
keys.preparingOrderSetKey = 'preparingOrder:';
keys.rejectedOrderKey = 'rejectedOrder:';
keys.reportedOrderKey = 'reportedOrder:';

keys.iconButtonItemKey = template('iconButtonItems:<%= countryId %>');

keys.carouselItemKey = template('carouselItems:<%= countryId %>');

keys.expressDeliveryDriverTokenKey = template(
  'expressDeliveryOrder:<%= orderSetId %>:driverToken:<%= driverId %>'
);

keys.expressDeliveryAllDriverTokenKey = template(
  'expressDeliveryOrder:<%= orderSetId %>:driverToken:*'
);

module.exports = keys;
