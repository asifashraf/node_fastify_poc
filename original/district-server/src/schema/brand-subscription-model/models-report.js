const { mapKeys, camelCase } = require('lodash');
const Transform = require('stream').Transform;

class ModelReport extends Transform {
  constructor(options) {
    const withDefaults = {
      objectMode: true,
      ...(options || {}),
    };

    super(withDefaults);
  }
  // eslint-disable-next-line complexity
  _transform(rawRow, enc, next) {
    const row = mapKeys(rawRow, (v, k) => camelCase(k));
    const values = {
      ...row,
    };

    if (!values.paymentMethod) {
      row.paymentMethod = 'No Charge';
    }

    const formatted = {};

    mapKeys(ModelReport.HEADERS, (header, rowAttr) => {
      formatted[header] = values[rowAttr];
    });

    this.push(formatted);

    next();
  }
}

ModelReport.HEADERS = {
  brandId: 'Brand ID',
  countryName: 'Country name',
  brandName: 'Brand name',
  signDate: 'Sign Date',
  expiryDate: 'Expiry Date',
  revenueModel: 'Revenue Model',
  flatRate: 'Flat rate',
  pickupCommission: 'Pickup Commission',
  deliveryCommission: 'Delivery Commission',
  currencySymbol: 'Currency',
};

module.exports = ModelReport;
