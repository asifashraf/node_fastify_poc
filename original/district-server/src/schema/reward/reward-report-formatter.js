const { mapKeys, camelCase } = require('lodash');
const Transform = require('stream').Transform;

class RewardReportFormatter extends Transform {
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

    mapKeys(RewardReportFormatter.HEADERS, (header, rowAttr) => {
      formatted[header] = values[rowAttr];
    });

    this.push(formatted);

    next();
  }
}

RewardReportFormatter.HEADERS = {
  title: 'Name',
  titleAr: 'Name (Ar)',
  titleTr: 'Name (Tr)',
  conversionRate: 'Conversion Rate',
  brandName: 'Brand',
  countryName: 'Country',
  status: 'Status',
};

module.exports = RewardReportFormatter;
