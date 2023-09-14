/* eslint-disable camelcase */
const fs = require('fs');
const readline = require('readline');
const { trim, find } = require('lodash');

const knex = require('../../database');
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
  knex
    .transaction(async trx => {
      const { rows } = await trx.raw(
        `SELECT * FROM customers WHERE "password" IS NULL AND "email" IS NOT NULL LIMIT 10000`
      );

      const updates = [];
      rows.map(row => {
        const customerPass = find(
          customers,
          o => o.email.toLowerCase() === row.email.toLowerCase()
        );
        if (customerPass) {
          console.log(row.id);
          console.log(customerPass);
          updates.push(
            trx('customers')
              .update({ password: customerPass.passwordHash })
              .where({ id: row.id })
          );
        }
        return row;
      });

      // ibrahim.hadi@gmail.com
      // auth0|5dc50bf968496b0df9fc04e5
      // const a = find(customers, o => o.email === 'ibrahim.hadi@gmail.com');
      // console.log(a);
      // console.log(customers.length);

      return Promise.all(updates);
    })
    .then(() => {
      console.log('all done!');
      return knex.destroy();
    })
    .catch(err => {
      console.log('error', err);
      return knex.destroy();
    });
});
