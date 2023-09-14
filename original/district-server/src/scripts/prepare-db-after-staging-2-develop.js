/* eslint-disable camelcase */
const { find, omit } = require('lodash');

const { uuid } = require('../lib/util');
const knex = require('../../database');

const admins = [
  {
    id: '85b1c6fc-e188-4acc-ad84-9fbbdaef18b7',
    autho_id: 'auth0|5d2c61043f9bec0d41565c5b',
    name: 'Moaz',
    email: 'moaz+dev@cofeapp.com',
    password: null,
    status: 'ACTIVE',
    created: '2019-11-24 14:41:42.862058+02',
    updated: '2019-11-25 11:52:06.11224+02',
    picture:
      'https://s.gravatar.com/avatar/e389415675a7d02e30c0e846c5af599c?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fmo.png',
    group_name: 'ONE Tech',
  },
  {
    id: '0cd2cd06-e8b1-4f1f-ab35-0bd633a0aae4',
    autho_id: 'LavSkz4h7pWhvKwUZYtgC5D9vqE3',
    name: 'Awais',
    email: 'awais+dev@one.xyz',
    password: null,
    status: 'ACTIVE',
    created: '2019-12-04 16:00:32.034812+02',
    updated: '2020-01-29 10:09:22.580686+02',
    picture: null,
    group_name: 'ONE Tech',
  },
  {
    id: '6daa94eb-161a-42b3-95e6-924faa2212b9',
    autho_id: 'tflaFV06xuXS9GAmGe0d31kt62D3',
    name: 'Aurel Stocheci',
    email: 'aurel+develop@one.xyz',
    password: '',
    status: 'ACTIVE',
    created: '2020-01-22 14:50:37.299111+02',
    updated: '2020-01-22 14:50:37.299111+02',
    picture: '',
    group_name: 'ONE Tech',
  },
  {
    id: 'e67a878d-7f6f-4557-9972-b5ab9fe5ca1d',
    autho_id: 'tHwzqI0S1HOEYhWXuAP6Yb24wQt2',
    name: 'Ghita Istrate',
    email: 'ghita+dev@one.xyz',
    password: '',
    status: 'ACTIVE',
    created: '2020-01-22 14:52:37.570573+02',
    updated: '2020-01-22 14:52:37.570573+02',
    picture: '',
    group_name: 'ONE Tech',
  },
  {
    id: '52b693ce-14c6-4317-90f4-c229018f0a51',
    autho_id: '4yr4mN2kn8OgaXznGS2wKG3BR1l1',
    name: 'Silviu Marinescu',
    email: 'silviu@one.xyz',
    password: '',
    status: 'ACTIVE',
    created: '2019-11-11 13:41:19.096499+02',
    updated: '2020-01-29 10:09:22.643611+02',
    picture: null,
    group_name: 'ONE Tech',
  },
  {
    id: 'ceb54ae4-1e96-479d-8741-e4d0ff3abb26',
    autho_id: 'dNxrYVvNtKTwlzSPO9WAS0EJA7N2',
    name: 'Ruxandra',
    email: 'ruxandra+dev@one.xyz',
    password: '$2b$15$arbj7hYkaox2bImPeYjlROksqv4T/uWZLBp8a3FYQMZN8UaTh.e.C',
    status: 'ACTIVE',
    created: '2020-01-29 14:25:48.797208+02',
    updated: '2020-01-29 14:25:48.797208+02',
    picture: null,
    group_name: 'ONE Tech',
  },
  {
    id: '3d5f3886-c435-4007-a818-3d4e8b97ead8',
    autho_id: 'FNIAoZAADMff24MyI29Lg56GGwB3',
    name: 'Ramsha ',
    email: 'ramsha+dev@one.xyz',
    password: '$2b$15$bQy/5.AE5CEj353aJZh0s.SzAFWVeZ59o0XPR0GomrOhm2zGbh7iu',
    status: 'ACTIVE',
    created: '2020-01-29 14:38:00.879361+02',
    updated: '2020-01-29 14:38:00.879361+02',
    picture: null,
    group_name: 'ONE Tech',
  },
  {
    id: 'ac0118e0-d2f9-4b6c-8152-e272bd48d309',
    autho_id: '06U2JXPh57UskSG5HCn2ogqlVgY2',
    name: 'Dan',
    email: 'dan+dev@one.xyz',
    password: '$2b$15$arjrs/Y4O4nttY2eijIme.9SkMP5cOKWuc4LTOL.B4OY4cbh4QU/K',
    status: 'ACTIVE',
    created: '2020-01-29 20:08:07.331886+02',
    updated: '2020-01-29 20:08:07.331886+02',
    picture: null,
    group_name: 'ONE Tech',
  },
  {
    id: 'd5f90b77-a33f-4dfc-9a04-698f82ec3a85',
    autho_id: 'gGSiFxsnFsWHf7stxWkgJb925Ki2',
    name: 'Sheraz',
    email: 'sheraz@cofedistrict.com',
    password: '$2b$15$s5015OB.oGnkZJal0IT7PeSDO4G4YpbK1FNUciPId9kwiiLe1AjbC',
    status: 'ACTIVE',
    created: '2020-02-18 11:21:56.866122+02',
    updated: '2020-02-18 11:22:51.835922+02',
    picture: null,
    group_name: 'ONE Tech',
  },
];

const customers = [
  {
    id: 'auth0|5d35be17bb742d0db5b216b6',
    first_name: 'Phil',
    last_name: 'Letourneau',
    phone_number: '96501151',
    email: 'phil+dev@one.xyz',
    is_phone_verified: false,
    phone_country: 'KW',
    sms_delivery_updates: true,
    sms_pickup_updates: true,
    push_delivery_updates: true,
    push_pickup_updates: true,
    new_offers: true,
    loyalty_tier: 'GREEN',
    photo: null,
    birthday: null,
    password: '$2b$10$pJC1Kc.MvCOuTnEIYagK.eLYrKXNp4E6gLrnwmUdMlEOeA4Ad46ji',
    status: 'NEW',
    created: '2019-07-22 16:46:01.392+03',
    updated: '2020-02-16 17:06:53.119135+02',
    preferred_language: 'EN',
    autho_id: null,
    country_id: '01c73b60-2c6a-45f1-8dbf-88a5ce4ad179',
    referral_code: 'NFEP4N',
    is_email_verified: false,
    signup_promo_id: null,
  },
  {
    id: 'auth0|5d31931ee592360cc5217ff6',
    first_name: 'Saad',
    last_name: 'Aamir',
    phone_number: '66006458',
    email: 'saad+Dev4@cofeapp.com',
    is_phone_verified: false,
    phone_country: 'KW',
    sms_delivery_updates: false,
    sms_pickup_updates: false,
    push_delivery_updates: true,
    push_pickup_updates: true,
    new_offers: false,
    loyalty_tier: 'GREEN',
    photo:
      'https://cloudinary-cofeapp.s3.eu-west-1.amazonaws.com/lznbyjhjtcraiw77o6ma.jpg',
    birthday: '2004-07-19',
    password: '$2b$10$dDMlhUKNMK8TDm1eMtYTrOjVX713clypkCYLsiXCMoAoO.rTNxhyq',
    status: 'NEW',
    created: '2019-07-19 12:53:37.811+03',
    updated: '2020-02-16 17:06:53.091668+02',
    preferred_language: 'EN',
    autho_id: null,
    country_id: '01c73b60-2c6a-45f1-8dbf-88a5ce4ad179',
    referral_code: '53DPT3',
    is_email_verified: false,
    signup_promo_id: null,
  },
  {
    id: 'auth0|5d2c61043f9bec0d41565c5b',
    first_name: 'Muhammad',
    last_name: 'Moaz',
    phone_number: '90909090',
    email: 'moaz+dev@cofeapp.com',
    is_phone_verified: false,
    phone_country: 'KW',
    sms_delivery_updates: true,
    sms_pickup_updates: true,
    push_delivery_updates: true,
    push_pickup_updates: true,
    new_offers: true,
    loyalty_tier: 'GREEN',
    photo: null,
    birthday: null,
    password: '$2b$10$yrmjeHyT8TE7Rlv4Rm4RQOsfsZl1d06zkNZyannI42juNUqZ1uslW',
    status: 'NEW',
    created: '2019-07-15 14:18:32.351+03',
    updated: '2020-02-16 17:06:53.087532+02',
    preferred_language: 'EN',
    autho_id: null,
    country_id: '01c73b60-2c6a-45f1-8dbf-88a5ce4ad179',
    referral_code: '0K6WE2',
    is_email_verified: false,
    signup_promo_id: null,
  },
  {
    id: 'FNIAoZAADMff24MyI29Lg56GGwB3',
    first_name: 'Ramsha ',
    last_name: 'Ghanchi',
    phone_number: null,
    email: 'ramsha+dev@one.xyz',
    is_phone_verified: false,
    phone_country: null,
    sms_delivery_updates: true,
    sms_pickup_updates: true,
    push_delivery_updates: true,
    push_pickup_updates: true,
    new_offers: true,
    loyalty_tier: 'GREEN',
    photo: null,
    birthday: null,
    password: null,
    status: null,
    created: '2020-02-01 14:05:20.247865+02',
    updated: '2020-03-24 21:36:52.298565+02',
    preferred_language: 'EN',
    autho_id: null,
    country_id: null,
    referral_code: '0L34N8',
    is_email_verified: false,
    signup_promo_id: null,
  },
  {
    id: 'tflaFV06xuXS9GAmGe0d31kt62D3',
    first_name: 'Aurel',
    last_name: 'Stocheci',
    phone_number: '67737633',
    email: 'aurel+develop@one.xyz',
    is_phone_verified: false,
    phone_country: 'KW',
    sms_delivery_updates: true,
    sms_pickup_updates: true,
    push_delivery_updates: true,
    push_pickup_updates: true,
    new_offers: true,
    loyalty_tier: 'GREEN',
    photo: null,
    birthday: null,
    password: '$2b$15$.QtoYdK9BLqWjYBBYCjQ5OCOsSd2swdDOSoRSVmA4D4tun/unXwWW',
    status: 'NEW',
    created: '2019-12-14 14:33:35.726+02',
    updated: '2020-02-16 17:06:53.15762+02',
    preferred_language: 'EN',
    autho_id: null,
    country_id: null,
    referral_code: 'FR50M2',
    is_email_verified: false,
    signup_promo_id: null,
  },
  {
    id: 'DHhEbQJifZPxTpz1daspW5D4NUc2',
    first_name: 'Ruxandra',
    last_name: 'dev',
    phone_number: '541112233',
    email: 'ruxandra+develop@one.xyz',
    is_phone_verified: false,
    phone_country: 'SA',
    sms_delivery_updates: true,
    sms_pickup_updates: true,
    push_delivery_updates: true,
    push_pickup_updates: true,
    new_offers: true,
    loyalty_tier: 'GREEN',
    photo: null,
    birthday: null,
    password: '$2b$15$XgCYVftDcolkmvUuKAVrJ.E26bjdaggLjOu3QPp5mLhQbW9NJ3S56',
    status: 'NEW',
    created: '2020-02-01 13:26:43.954+02',
    updated: '2020-03-24 21:13:45.920839+02',
    preferred_language: 'EN',
    autho_id: null,
    country_id: '47beceb7-b623-44dd-a037-8a9f62da935c',
    referral_code: 'JURCRP',
    is_email_verified: false,
    signup_promo_id: null,
  },
  {
    id: 'tHwzqI0S1HOEYhWXuAP6Yb24wQt2',
    first_name: 'ghita',
    last_name: 'istrate',
    phone_number: '65416497',
    email: 'ghita+dev@one.xyz',
    is_phone_verified: false,
    phone_country: 'KW',
    sms_delivery_updates: true,
    sms_pickup_updates: true,
    push_delivery_updates: true,
    push_pickup_updates: true,
    new_offers: true,
    loyalty_tier: 'GREEN',
    photo: null,
    birthday: null,
    password: '$2b$15$meZsK4WuCiZO.ayDdMYdK.FrzxPvALmQ61AbHj0HLzc/ZoKsjX4NO',
    status: 'NEW',
    created: '2019-12-08 11:09:06.465+02',
    updated: '2020-03-25 08:05:31.858436+02',
    preferred_language: 'EN',
    autho_id: null,
    country_id: '01c73b60-2c6a-45f1-8dbf-88a5ce4ad179',
    referral_code: 'CYKLWD',
    is_email_verified: false,
    signup_promo_id: null,
  },
];

knex
  .transaction(async trx => {
    // truncate admins cascade
    // truncate customers cascade
    // truncate orders cascade
    // truncate loyalty orders cascade
    const groups = await trx('groups');

    await Promise.all(
      admins.map(async _admin => {
        const admin = await trx('admins')
          .where({ id: _admin.id })
          .first();
        if (!admin) {
          const adminInput = omit(_admin, ['group_name', 'created', 'updated']);
          await trx('admins').insert(adminInput);
        }
        return _admin;
      })
    );

    await Promise.all(
      admins.map(async _admin => {
        const groupAdmins = _admin.group_name.split(', ').map(_groupName => {
          const group = find(groups, g => g.name === _groupName);
          if (!group) {
            return null;
          }
          return {
            id: uuid.get(),
            group_id: group.id,
            admin_id: _admin.id,
          };
        });
        await trx('group_admins')
          .where('admin_id', _admin.id)
          .delete();
        await trx('group_admins').insert(groupAdmins);
      })
    );

    await Promise.all(
      customers.map(async _customer => {
        const customer = await trx('customers')
          .where({ id: _customer.id })
          .first();
        if (!customer) {
          const customerInput = omit(_customer, ['created', 'updated']);
          await trx('customers').insert(customerInput);
        }
        return _customer;
      })
    );
  })
  .then(async () => {
    console.log('all done!');
    return knex.destroy();
  })
  .catch(async err => {
    console.log('error', err);
    return knex.destroy();
  });
