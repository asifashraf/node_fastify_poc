const { mapKeys, camelCase } = require('lodash');
const Transform = require('stream').Transform;

class BrandReportFormatter extends Transform {
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
    const values = {
      ...row,
    };

    const formatted = {};

    mapKeys(BrandReportFormatter.HEADERS, (header, rowAttr) => {
      formatted[header] = values[rowAttr];
    });

    this.push(formatted);

    next();
  }
}

BrandReportFormatter.HEADERS = {
  name: 'Name',
  nameAr: 'Name (Ar)',
  nameTr: 'Name (Tr)',
  branches: 'Branches',
  vouchers: 'Vouchers',
  countryName: 'Country',
  status: 'Status',
};

module.exports = BrandReportFormatter;
