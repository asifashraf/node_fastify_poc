const { mapKeys, camelCase } = require('lodash');
const Transform = require('stream').Transform;

class CustomersFormatter extends Transform {
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
    mapKeys(CustomersFormatter.HEADERS, (header, rowAttr) => {
      formatted[header] = values[rowAttr];
    });

    this.push(formatted);

    next();
  }
}

CustomersFormatter.HEADERS = {
  id: 'external_id',
  firstName: 'first_name',
  lastName: 'last_name',
  phoneNumber: 'phone',
  email: 'email',
  allowSms: 'Allow SMS',
  allowEmail: 'Allow Email',
};

module.exports = CustomersFormatter;
