/* eslint-disable camelcase */
const { find, omit } = require('lodash');

const { uuid } = require('../lib/util');
const knex = require('../../database');

const admins = [
  {
    id: '2ca9af4c-ecb6-4954-c291-4f36cd71add3',
    autho_id: 'YyJNk7uYXiYSLy1MCQhxChfLxDl1',
    name: 'silviu',
    email: 'silviu@one.xyz',
    password: null,
    status: 'ACTIVE',
    created: '2019-12-10 11:28:47.393909+02',
    updated: '2019-12-18 11:24:09.694257+02',
    picture: null,
    group_name: 'Super Admins',
  },
  {
    id: 'bc9b77fa-9376-4bb3-bcab-1a46715854bd',
    autho_id: 'ZDgLd8BzBmYLDsKiov0d8cjx5kt2',
    name: 'Ghita',
    email: 'ghita+staging@one.xyz',
    password: null,
    status: 'ACTIVE',
    created: '2019-12-08 11:21:03.570213+02',
    updated: '2019-12-18 11:24:09.694257+02',
    picture: null,
    group_name: 'ONE Tech',
  },
  {
    id: '4670ba85-5752-4926-942a-c651ca6cb63b',
    autho_id: 'bWR1qGnb1TQoQWFL8RGdBootv3S2',
    name: 'Test',
    email: 'awais+toby@one.xyz',
    password: '$2b$15$FrvxvTgL9PvY0s.DKW6iqeUyA73xA.fgobC4rpy78TdVRsuuvDhXO',
    status: 'ACTIVE',
    created: '2019-12-17 12:24:42.099097+02',
    updated: '2020-01-02 23:59:24.039637+02',
    picture: null,
    group_name: 'CSE',
  },
  {
    id: '342f57f0-4e1a-45f9-8bdf-f1aae3613d9c',
    autho_id: 'XpHcykF8oTX0cvpkho1G2GRaPkg2',
    name: "Toby's Estate",
    email: 'awais+toby2@one.xyz',
    password: '$2b$15$yJvAlY6hhnx0A.IOe.aRJerE.pOpG/wNLKx/ajzcArPCLP874Fq8i',
    status: 'ACTIVE',
    created: '2019-12-17 12:38:32.092829+02',
    updated: '2019-12-18 11:24:09.694257+02',
    picture: null,
    group_name: 'CSE',
  },
  {
    id: 'b161f9c4-da80-4c53-9462-6259ad98e0d8',
    autho_id: 'auth0|5daeda613b4d090ddfb25d37',
    name: 'Ramsha',
    email: 'ramsha+staging@one.xyz',
    password: '$2b$10$sCs8JTyNWAD73INHVUXlCOmzJv7IQUlq09rvpFSg7W14yxmUWSeoS',
    status: 'ACTIVE',
    created: '2019-11-20 17:17:51.991036+02',
    updated: '2019-12-18 21:11:27.016858+02',
    picture:
      'https://s.gravatar.com/avatar/dff1e62a59e2f01a57130bd174231d99?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fra.png',
    group_name: 'ONE Tech, Super Admins',
  },
  {
    id: '5f296039-c8e1-48fc-9ba8-b9974660f7ce',
    autho_id: 'g9aKq09g0vgcGT4clkZwBShT2zo2',
    name: 'sheraz+staging2@cofeapp.com',
    email: 'sheraz+staging2@cofeapp.com',
    password: '$2b$15$imtUyBKKCw.rspvwbmdD9OCdbT3xcz3wLLxU2stB5WX6mbQHmKt1O',
    status: 'ACTIVE',
    created: '2019-12-17 14:00:23.821985+02',
    updated: '2019-12-18 11:24:09.694257+02',
    picture: null,
    group_name: 'ONE Tech',
  },
  {
    id: '7ecb16b8-13c1-4fe9-9c70-591a188bf744',
    autho_id: 'auth0|5db9ebafd036ea0d646d2af6',
    name: 'Awais',
    email: 'awais+staging@one.xyz',
    password: '$2b$10$M0orHon/IAk0EmgeadxtwePQrdlNh17sSNFyrLHtlNSUj47C3UURG',
    status: 'ACTIVE',
    created: '2019-12-04 15:40:49.651129+02',
    updated: '2019-12-18 11:24:09.694257+02',
    picture:
      'https://s.gravatar.com/avatar/8728c6a5d6148ce9b61eb2dc5ae8c3bc?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Faw.png',
    group_name: 'ONE Tech',
  },
  {
    id: 'dd082c87-382a-48d6-bdb6-eadeea268a6a',
    autho_id: 'ChzAxgYxQWet5sgkw1aIZZCzMKk1',
    name: 'Dan',
    email: 'dan+staging@cofeapp.com',
    password: null,
    status: 'ACTIVE',
    created: '2019-12-08 12:25:18.015997+02',
    updated: '2019-12-18 11:24:09.694257+02',
    picture: null,
    group_name: 'ONE Tech',
  },
  {
    id: '548fcddd-7d4a-40e4-ad25-a98c12344c5d',
    autho_id: 'auth0|5dc1a0a4b402a8104916606b',
    name: 'Ruxandra',
    email: 'ruxandra+staging@one.xyz',
    password: '$2b$10$8nFbrXurA3MOvnV2M8LOEevjn//CxTRUv/7sQZuJeIoxmt50JoVY2',
    status: 'ACTIVE',
    created: '2019-12-04 15:54:45.246337+02',
    updated: '2019-12-18 13:45:57.386598+02',
    picture:
      'https://s.gravatar.com/avatar/1962be0e8346802fb089a27124a0066d?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fru.png',
    group_name: 'Super Admins',
  },
  {
    id: '04399263-dabf-4b83-b3ab-6ddc8883d359',
    autho_id: 'auth0|5d3fe0fde7b9360dc9d156d5',
    name: 'Saad',
    email: 'saad+staging@cofeapp.com',
    password: '$2b$10$TaM7xLPhuYpa22riqulNGua852lCgzB8FhTFdUljnkoLm/fWOzamm',
    status: 'ACTIVE',
    created: '2019-12-04 15:53:59.518774+02',
    updated: '2019-12-18 11:24:09.694257+02',
    picture:
      'https://s.gravatar.com/avatar/0d8d0e8ca0a7f60d7ae1383d6a8aa840?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fsa.png',
    group_name: 'Super Admins, ONE Tech',
  },
  {
    id: 'b5e7efd2-95a1-4f9e-ae79-1ad5c2e4a500',
    autho_id: 'rXYLb9tIm7U1Beavsg9OmNNeV5n2',
    name: 'Aurel',
    email: 'aurel+staging@one.xyz',
    password: null,
    status: 'ACTIVE',
    created: '2019-12-09 14:27:15.466967+02',
    updated: '2019-12-18 16:02:31.972299+02',
    picture: null,
    group_name: 'ONE Tech',
  },
  {
    id: 'af4f1dc7-618b-4f74-afa9-d26caefec97d',
    autho_id: 'auth0|5c9e13730f28391111e1c26e',
    name: 'Phil',
    email: 'phil+staging@one.xyz',
    password: '$2b$15$ic4hNlnyv7Ssx4GPi6DAF.Peh685BF.QB7xD.VqluW1T.veChDi7u',
    status: 'ACTIVE',
    created: '2019-12-08 11:24:40.088092+02',
    updated: '2020-01-26 22:30:32.033578+02',
    picture: null,
    group_name: 'ONE Tech, Super Admins',
  },
  {
    id: '652a6a6b-2121-4062-9fad-746d521d7608',
    autho_id: 'C1PtTXF2JEWWTIKFtmq2IhR4EzA2',
    name: 'Ruxandra Saudia',
    email: 'ruxandra+saudi@one.xyz',
    password: null,
    status: 'ACTIVE',
    created: '2019-12-11 18:45:28.9845+02',
    updated: '2019-12-18 11:24:09.694257+02',
    picture: null,
    group_name: 'Super Admins',
  },
];

const customers = [
  {
    id: 'rXYLb9tIm7U1Beavsg9OmNNeV5n2',
    first_name: 'Aurel',
    last_name: 'Stocheci',
    phone_number: '752063920',
    email: 'aurel+staging@one.xyz',
    is_phone_verified: false,
    phone_country: 'RO',
    sms_delivery_updates: true,
    sms_pickup_updates: true,
    push_delivery_updates: true,
    push_pickup_updates: true,
    new_offers: true,
    loyalty_tier: 'GREEN',
    photo: null,
    birthday: null,
    password: '$2b$15$mDD/EN7tLtx6/2zh25DUZe9Cno9lgvPeTGC.Fts9h38J1Mh2ENEcu',
    status: 'NEW',
    created: '2019-12-09 14:26:17.921+02',
    updated: '2020-01-24 17:50:24.061597+02',
    preferred_language: 'EN',
    autho_id: null,
    country_id: null,
  },
  {
    id: 'auth0|5d39903453a48d0ef88d969c',
    first_name: 'testing',
    last_name: 'test',
    phone_number: '66767802',
    email: 'stagingenv@one.xyz',
    is_phone_verified: false,
    phone_country: 'OM',
    sms_delivery_updates: false,
    sms_pickup_updates: false,
    push_delivery_updates: true,
    push_pickup_updates: true,
    new_offers: false,
    loyalty_tier: 'GREEN',
    photo:
      'https://cloudinary-cofeapp.s3.eu-west-1.amazonaws.com/user-dp/auth0%7C5d39903453a48d0ef88d969c.jpg',
    birthday: '2005-09-12',
    password: '$2b$15$o3VykcDGGXelN8/gcMPU9etOtY3tZeBiGF1bBgiQV/VJXOCMNQm0y',
    status: 'NEW',
    created: '2019-07-25 14:19:18.854+03',
    updated: '2020-01-27 11:40:51.630793+02',
    preferred_language: 'EN',
    autho_id: null,
    country_id: null,
  },
  {
    id: 'E1ghd0Cw3LS31XR7ykx7CFgPMkG3',
    first_name: 'Rux',
    last_name: 'Kuwait',
    phone_number: '67546474',
    email: 'ruxandra+kuwait@one.xyz',
    is_phone_verified: false,
    phone_country: 'KW',
    sms_delivery_updates: true,
    sms_pickup_updates: true,
    push_delivery_updates: true,
    push_pickup_updates: true,
    new_offers: true,
    loyalty_tier: 'GREEN',
    photo:
      'https://cloudinary-cofeapp.s3.eu-west-1.amazonaws.com/user-dp/E1ghd0Cw3LS31XR7ykx7CFgPMkG3.jpg',
    birthday: '2006-01-15',
    password: '$2b$15$keTY0CjIaE/vT2d.w/Sb7ueMXQj55WE.xxtkSmKEnWQ3D7HrnGNby',
    status: 'NEW',
    created: '2019-12-11 16:31:53.681+02',
    updated: '2020-01-15 17:33:58.970282+02',
    preferred_language: 'EN',
    autho_id: null,
    country_id: null,
  },
  {
    id: 'auth0|5dc1a0a4b402a8104916606b',
    first_name: 'Ruxandra',
    last_name: 'Carbunaru',
    phone_number: '67876545',
    email: 'ruxandra+staging@one.xyz',
    is_phone_verified: false,
    phone_country: 'KW',
    sms_delivery_updates: false,
    sms_pickup_updates: false,
    push_delivery_updates: false,
    push_pickup_updates: true,
    new_offers: false,
    loyalty_tier: 'GREEN',
    photo:
      'https://cloudinary-cofeapp.s3.eu-west-1.amazonaws.com/user-dp/auth0%7C5dc1a0a4b402a8104916606b.jpg',
    birthday: '2006-01-16',
    password: '$2b$15$zSWK4vLNt.O3VmigBxExveMp0TQLeATcE9gpd2cmEyl0N/Wthva5S',
    status: 'NEW',
    created: '2019-11-05 18:17:43.597+02',
    updated: '2020-01-24 07:40:33.661678+02',
    preferred_language: 'EN',
    autho_id: null,
    country_id: null,
  },
  {
    id: 'ZDgLd8BzBmYLDsKiov0d8cjx5kt2',
    first_name: 'ghita',
    last_name: 'istrate',
    phone_number: '65431661',
    email: 'ghita+staging@one.xyz',
    is_phone_verified: false,
    phone_country: 'KW',
    sms_delivery_updates: true,
    sms_pickup_updates: true,
    push_delivery_updates: true,
    push_pickup_updates: true,
    new_offers: true,
    loyalty_tier: 'GREEN',
    photo:
      'https://cloudinary-cofeapp.s3.eu-west-1.amazonaws.com/user-dp/ZDgLd8BzBmYLDsKiov0d8cjx5kt2.jpg',
    birthday: null,
    password: '$2b$15$1m7ciM4eUdrK5y55CLz3GerIJkuYowL1tKZwgVs7FMN4YS9pqVGRO',
    status: 'NEW',
    created: '2019-12-08 11:07:30.922+02',
    updated: '2020-01-22 16:51:48.751227+02',
    preferred_language: 'EN',
    autho_id: null,
    country_id: null,
  },
  {
    id: 'auth0|5db9ebafd036ea0d646d2af6',
    first_name: 'Muhamamd',
    last_name: 'Awais',
    phone_number: '66666666',
    email: 'awais+staging@one.xyz',
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
    password: '$2b$15$YsNe32gkQ8Zm/Ee5E7i92.w4OUz6plO5rI0oBrbwc3dDcTCWb1AiW',
    status: 'NEW',
    created: '2019-10-30 21:59:46.534+02',
    updated: '2019-10-30 21:59:49.002187+02',
    preferred_language: 'EN',
    autho_id: null,
    country_id: null,
  },
  {
    id: 'auth0|5daeda613b4d090ddfb25d37',
    first_name: 'Ramsha',
    last_name: 'G',
    phone_number: '502011607',
    email: 'ramsha+staging@one.xyz',
    is_phone_verified: false,
    phone_country: 'AE',
    sms_delivery_updates: false,
    sms_pickup_updates: false,
    push_delivery_updates: true,
    push_pickup_updates: true,
    new_offers: false,
    loyalty_tier: 'GREEN',
    photo: null,
    birthday: '1993-10-08',
    password: '$2b$15$sR2ylDMvQ8Y2lN58lRi9YeROUDnOwEyfxSqfwfF9zuzsjt1PIeAA2',
    status: 'NEW',
    created: '2019-10-22 13:31:00.417+03',
    updated: '2019-12-25 10:04:47.548526+02',
    preferred_language: 'EN',
    autho_id: null,
    country_id: null,
  },
  {
    id: 'auth0|5c9e13730f28391111e1c26e',
    first_name: 'Phil',
    last_name: 'Letourneau',
    phone_number: '96511111',
    email: 'phil+staging@one.xyz',
    is_phone_verified: false,
    phone_country: 'KW',
    sms_delivery_updates: true,
    sms_pickup_updates: true,
    push_delivery_updates: true,
    push_pickup_updates: true,
    new_offers: true,
    loyalty_tier: 'GREEN',
    photo: null,
    birthday: '1989-03-29',
    password: '$2b$10$Z2zTIaQmZPM2idfzdqxHuuWFeRLx5h4K2srrUTAP.nqRdBTVHnDMa',
    status: null,
    created: '2019-07-23 16:54:46.493629+03',
    updated: '2019-11-14 13:40:28.422586+02',
    preferred_language: 'EN',
    autho_id: null,
    country_id: null,
  },
  {
    id: 'fdG2qVZoIGUr6RdMDT33fMi3eI53',
    first_name: 'Rux I',
    last_name: 'Carbunaru',
    phone_number: '766498911',
    email: 'ruxandra+first@one.xyz',
    is_phone_verified: false,
    phone_country: 'RO',
    sms_delivery_updates: true,
    sms_pickup_updates: true,
    push_delivery_updates: true,
    push_pickup_updates: true,
    new_offers: true,
    loyalty_tier: 'GREEN',
    photo: null,
    birthday: null,
    password: '$2b$15$FPKTIVKZAJDSHH8Wy5l9veBHHWzhBpsjOHOih9uvR57k.dlzgm2JC',
    status: 'NEW',
    created: '2020-01-19 15:21:16.148+02',
    updated: '2020-01-19 15:21:18.614588+02',
    preferred_language: 'EN',
    autho_id: null,
    country_id: null,
  },
  {
    id: 'auth0|5d3fe0fde7b9360dc9d156d5',
    first_name: 'Saad',
    last_name: 'Aamir',
    phone_number: '56009123',
    email: 'saad+staging@cofeapp.com',
    is_phone_verified: false,
    phone_country: 'KW',
    sms_delivery_updates: false,
    sms_pickup_updates: false,
    push_delivery_updates: true,
    push_pickup_updates: true,
    new_offers: false,
    loyalty_tier: 'GREEN',
    photo:
      'https://cloudinary-cofeapp.s3.eu-west-1.amazonaws.com/user-dp/auth0%7C5d3fe0fde7b9360dc9d156d5.jpg',
    birthday: '1993-10-20',
    password: '$2b$10$TaM7xLPhuYpa22riqulNGua852lCgzB8FhTFdUljnkoLm/fWOzamm',
    status: 'NEW',
    created: '2019-07-30 09:17:35.843+03',
    updated: '2019-12-29 22:37:20.158394+02',
    preferred_language: 'EN',
    autho_id: null,
    country_id: null,
  },
  {
    id: 'C1PtTXF2JEWWTIKFtmq2IhR4EzA2',
    first_name: 'Rux',
    last_name: 'Saudi',
    phone_number: '512223333',
    email: 'ruxandra+saudi@one.xyz',
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
    password: '$2b$15$Q6fcBqmnWm8y2g.g8BOcReBjUo9ybzwG4OBrBdcTU0LoN.CuakcIK',
    status: 'NEW',
    created: '2019-12-11 16:15:33.009+02',
    updated: '2020-01-10 17:12:03.840477+02',
    preferred_language: 'EN',
    autho_id: null,
    country_id: null,
  },
  {
    id: 'ChzAxgYxQWet5sgkw1aIZZCzMKk1',
    first_name: 'Dan',
    last_name: 'Nistor',
    phone_number: '723713969',
    email: 'dan+staging@cofeapp.com',
    is_phone_verified: false,
    phone_country: 'RO',
    sms_delivery_updates: false,
    sms_pickup_updates: false,
    push_delivery_updates: true,
    push_pickup_updates: true,
    new_offers: false,
    loyalty_tier: 'GREEN',
    photo: null,
    birthday: null,
    password: '$2b$15$hdH6XaRGc7Li827HJO/OEeApTsTYalcHXBNNY9OaFgbzweXGqCGfq',
    status: 'NEW',
    created: '2019-12-08 12:23:16.287+02',
    updated: '2020-01-23 19:02:57.074425+02',
    preferred_language: 'EN',
    autho_id: null,
    country_id: null,
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
