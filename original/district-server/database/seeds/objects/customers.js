/* eslint-disable camelcase */
const casual = require('casual');
const { times } = require('lodash');

module.exports = () => {
  const customers = [];
  const referralCodes = [
    '3K37DA',
    '3K37DB',
    '3K37DC',
    '3K37DD',
    '3K37DE',
    '3K37DF',
    '3K37DG',
  ];
  customers.push({
    id: 'a788e584-866d-4eb0-9b05-d3459e05a86c',
    first_name: 'Frodo',
    last_name: 'Baggins',
    phone_number: casual.numerify('########'),
    phone_country: 'KW',
    is_phone_verified: true,
    email: 'frodo.baggins@hobitton.ts',
    autho_id: 'a788e584-866d-4eb0-9b05-d3459e05a86c',
    country_id: '01c73b60-2c6a-45f1-8dbf-88a5ce4ad179',
    referral_code: referralCodes[0],
  });

  times(3, index => {
    const first_name = casual.first_name;
    const last_name = casual.last_name;
    const domain = casual.domain;
    const email = `${first_name}.${last_name}@${domain}`;
    const sms_delivery_updates = true;
    const sms_pickup_updates = true;
    const push_delivery_updates = true;
    const push_pickup_updates = true;
    const new_offers = true;
    const loyalty_tier = 'GREEN';

    const id = casual.uuid;
    customers.push({
      id,
      first_name,
      last_name,
      phone_number: casual.numerify('########'),
      phone_country: 'KW',
      is_phone_verified: true,
      email,
      sms_delivery_updates,
      sms_pickup_updates,
      push_delivery_updates,
      push_pickup_updates,
      new_offers,
      loyalty_tier,
      autho_id: id,
      country_id: '01c73b60-2c6a-45f1-8dbf-88a5ce4ad179',
      referral_code: referralCodes[index + 1],
    });
  });

  // customers.push({
  //   id: '6a3e7e22-69ed-4bc1-99db-f255a3382416',
  //   first_name: 'Tobe',
  //   last_name: 'Upgraded',
  //   phone_number: '121121',
  //   phone_country: 'KW',
  //   is_phone_verified: true,
  // });

  // times(2, () => {
  //   const first_name = casual.first_name;
  //   const last_name = casual.last_name;
  //   const domain = casual.domain;
  //   const email = `${first_name}.${last_name}@${domain}`;
  //   customers.push({
  //     id: casual.uuid,
  //     first_name,
  //     last_name,
  //     phone_number: casual.numerify('########'),
  //     phone_country: 'KW',
  //     is_phone_verified: true,
  //     email,
  //   });
  // });

  return customers;
};
