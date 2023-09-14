/* eslint-disable camelcase */
const knex = require('../../database');
console.log('Running: set-default-country-kw-for-all-marketing-notification');

knex
  .transaction(async trx => {
    const defaultCountry = await knex('countries')
      .where('iso_code', 'KW')
      .first();
    await Promise.all([
      trx('marketing_notifications')
        .whereNull('country_id')
        .update({
          country_id: defaultCountry.id,
        }),
    ]);
    console.log('marketing_notifications updated!');
  })
  .then(async () => {
    console.log('all done!');
    return knex.destroy();
  })
  .catch(async err => {
    console.log('error', err);
    return knex.destroy();
  });
