const { mapKeys, camelCase } = require('lodash');
const Transform = require('stream').Transform;
const moment = require('moment');
const { timezone } = require('../../../config');

class BrandLocationReportFormatter extends Transform {
  constructor(options) {
    const withDefaults = {
      objectMode: true,
      ...(options || {}),
    };

    super(withDefaults);
  }
  _transform(rawRow, enc, next) {
    const row = mapKeys(rawRow, (v, k) => camelCase(k));
    // console.log('row', row);
    let fulfillments = row.hasDelivery ? 'Delviery' : '';
    if (fulfillments.length > 0) {
      fulfillments += ', ';
    }
    fulfillments += row.hasPickup ? 'Pickup' : '';
    const values = {
      ...row,
      fulfillments,
      createdAt: moment(row.createdAt)
        .tz(timezone)
        .format('YYYY-MM-DD HH:mm:ss'),
    };

    const formatted = {};

    mapKeys(BrandLocationReportFormatter.HEADERS, (header, rowAttr) => {
      formatted[header] = values[rowAttr];
    });

    this.push(formatted);

    next();
  }
}

BrandLocationReportFormatter.HEADERS = {
  name: 'Name',
  nameAr: 'Name (Ar)',
  nameTr: 'Name (Tr)',
  brandName: 'Brand Name',
  cityName: 'City',
  neighborhoodName: 'Neighborhood',
  shortAddress: 'Street',
  currencyName: 'Currency',
  phone: 'Contact',
  contactName: 'Manager',
  createdAt: 'Created On',
  fulfillments: 'Available Fulfillments',
};

module.exports = BrandLocationReportFormatter;
