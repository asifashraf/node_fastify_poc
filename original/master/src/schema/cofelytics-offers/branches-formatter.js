const { mapKeys, camelCase } = require('lodash');
const Transform = require('stream').Transform;

class BranchesFormatter extends Transform {
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
    mapKeys(BranchesFormatter.HEADERS, (header, rowAttr) => {
      formatted[header] = values[rowAttr];
    });

    this.push(formatted);

    next();
  }
}

BranchesFormatter.HEADERS = {
  id: 'Branch ID',
  name: 'Branch Name',
  nameAr: 'Branch Arabic Name',
  status: 'Status',
};

module.exports = BranchesFormatter;
