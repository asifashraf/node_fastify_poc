/* eslint-disable camelcase */
const fs = require('fs');
const readline = require('readline');
const { trim, find } = require('lodash');

const db = require('../../database');
const passwordJson = `${__dirname}/../../../cofe-district_appUsers.json`;

const readInterface = readline.createInterface({
  input: fs.createReadStream(passwordJson),
  output: false,
  console: false,
});

const customers = [];
readInterface.on('line', line => {
  if (trim(line) && trim(line) !== '') {
    customers.push(JSON.parse(trim(line)));
  }
});
// isValidBrandCoupon = true isValidCoupon = false
readInterface.on('close', () => {
  db.transaction(async trx => {
    const { rows } = await trx.raw(
      `SELECT * FROM customers WHERE created::varchar LIKE '2019-08-23 21:09%' LIMIT 10000`
    );

    const updates = [];
    rows.map(row => {
      if (!row.email) {
        return row;
      }
      const customerPass = find(
        customers,
        o => o.email.toLowerCase() === row.email.toLowerCase()
      );
      if (customerPass) {
        console.log(row.id);
        console.log(customerPass);
        updates.push(
          trx('customers')
            .update('created', customerPass.password_set_date.$date)
            .where({ id: row.id })
        );
      }
      return row;
    });

    // return [];
    return Promise.all(updates);
  })
    .then(() => {
      console.log('all done!');
      return db.destroy();
    })
    .catch(err => {
      console.log('error', err);
      return db.destroy();
    });
});
