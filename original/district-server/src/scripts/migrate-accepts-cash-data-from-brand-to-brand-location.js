/* eslint-disable camelcase */
const knex = require('../../database');
console.log('Running: migrate-accepts-cash-data-from-brand-to-brand-location');
knex('brands')
  .then(rows => {
    return Promise.all(
      rows.map(row => {
        return knex('brand_locations')
          .where({ brand_id: row.id })
          .update({ accepts_cash: row.accepts_cash })
          .then(() => {
            console.log('Transaction complete.');
          })
          .catch(err => {
            console.error(err);
          });
      })
    );
  })
  .then(() => {
    console.log('all done!');
    return knex.destroy();
  });
