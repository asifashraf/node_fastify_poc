/* eslint-disable camelcase */
const knex = require('../../database');
const { uuid } = require('../lib/util');

const paymentProvider = [
  {
    provider_name: 'CHECKOUT',
    country_id: '9ef3e7ae-0f82-45ce-b67f-a9b5dfc49d5c',
    status: 'ACTIVE'
  },
  {
    provider_name: 'CHECKOUT',
    country_id: '01c73b60-2c6a-45f1-8dbf-88a5ce4ad179',
    status: 'ACTIVE'
  },
  {
    provider_name: 'CHECKOUT',
    country_id: '47beceb7-b623-44dd-a037-8a9f62da935c',
    status: 'ACTIVE'
  },
  {
    provider_name: 'MY_FATOORAH',
    country_id: '01c73b60-2c6a-45f1-8dbf-88a5ce4ad179',
    status: 'ACTIVE'
  },
  {
    provider_name: 'MOBILE_EXPRESS',
    country_id: '9ef3e7ae-0f82-45ce-b67f-a9b5dfc49d5c',
    status: 'INACTIVE'
  },
  {
    provider_name: 'MOBILE_EXPRESS',
    country_id: '01c73b60-2c6a-45f1-8dbf-88a5ce4ad179',
    status: 'INACTIVE'
  },
  {
    provider_name: 'MOBILE_EXPRESS',
    country_id: '47beceb7-b623-44dd-a037-8a9f62da935c',
    status: 'INACTIVE'
  },
];

knex
  .transaction(async trx => {
    await Promise.all(
      paymentProvider.map(pp =>
        trx.raw(
          `INSERT INTO "payment_providers" ("id", "provider_name", "country_id", "status")
          VALUES ('${uuid.get()}', '${pp.provider_name}', '${pp.country_id}', '${pp.status}')
          ON CONFLICT DO NOTHING;`
        )
      )
    );
    console.log('payment provider done!');
  })
  .then(() => {
    console.log('all done!');
    return knex.destroy();
  })
  .catch(err => {
    console.log('error', err);
    return knex.destroy();
  });
