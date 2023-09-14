/* eslint-disable camelcase */
const knex = require('../../database');
const { find } = require('lodash');

const kdCurrencyId = 'f216d955-0df1-475d-a9ec-08cb6c0f92bb';
const currencies = [
  {
    id: 'c2f7dbe8-614e-42e8-96a2-4fcea9c631e3',
    name: 'United Arab Emirates Dirham',
    code: 'AED',
    code_ar: 'د.إ',
    decimal_place: '2',
  },
  {
    id: kdCurrencyId,
    name: 'Kuwaiti Dinar',
    code: 'KD',
    code_ar: 'د.ك',
    decimal_place: '3',
  },
  {
    id: 'bc7229c9-7cd7-4507-ad2a-f3dec15e5c47',
    name: 'Saudi Riyal',
    code: 'SAR',
    code_ar: 'ر.س',
    decimal_place: '2',
  },
];

const kwCountryId = '01c73b60-2c6a-45f1-8dbf-88a5ce4ad179';
const countries = [
  {
    id: kwCountryId,
    currency_id: kdCurrencyId,
    name: 'Kuwait',
    name_ar: 'الكويت',
    name_tr: 'Kuwait',
    status: 'ACTIVE',
    dial_code: '+965',
    iso_code: 'KW',
    flag_photo: '',
  },
  {
    id: '47beceb7-b623-44dd-a037-8a9f62da935c',
    currency_id: 'bc7229c9-7cd7-4507-ad2a-f3dec15e5c47',
    name: 'Saudi Arabia',
    name_ar: 'السعودية',
    name_tr: 'Saudi Arabia',
    status: 'INACTIVE',
    dial_code: '+966',
    iso_code: 'SA',
    flag_photo: '',
  },
  {
    id: '9ef3e7ae-0f82-45ce-b67f-a9b5dfc49d5c',
    currency_id: 'c2f7dbe8-614e-42e8-96a2-4fcea9c631e3',
    name: 'United Arab Emirates',
    name_ar: 'الإمارات',
    name_tr: 'United Arab Emirates',
    status: 'INACTIVE',
    dial_code: '+971',
    iso_code: 'AE',
    flag_photo: '',
  },
];

const defaultCityId = '3d7956f0-9f93-49f4-94b9-5f9a32183cf5';
const cities = [
  {
    id: defaultCityId,
    country_id: kwCountryId,
    name: 'Default City',
    name_ar: 'المدينة الافتراضية',
    name_tr: 'Default City',
    status: 'ACTIVE',
  },
  {
    id: '6330d83a-e209-45c8-a62a-4ae71aa5508b',
    country_id: kwCountryId,
    name: 'Farwaniya',
    name_ar: 'الفروانية',
    name_tr: 'Farwaniya',
    status: 'ACTIVE',
  },
  {
    id: '656c27ad-c794-45ad-ad8b-c2baaff50d16',
    country_id: kwCountryId,
    name: 'Hawalli',
    name_ar: 'حولي',
    name_tr: 'Hawalli',
    status: 'ACTIVE',
  },
  {
    id: 'ef0d6b57-0b6f-4722-a36b-c8a2e0bbb41e',
    country_id: kwCountryId,
    name: 'Al Asimah',
    name_ar: 'العاصمة',
    name_tr: 'Al Asimah',
    status: 'ACTIVE',
  },
  {
    id: 'eaf262b3-2c5d-4624-805f-79125bb2ec29',
    country_id: kwCountryId,
    name: 'Mubarak Al Kabeer',
    name_ar: 'مبارك الكبير',
    name_tr: 'Mubarak Al Kabeer',
    status: 'ACTIVE',
  },
  {
    id: '67286b0a-400a-4a4c-8b7f-96ef21873468',
    country_id: kwCountryId,
    name: 'Jahra',
    name_ar: 'الجهراء',
    name_tr: 'Jahra',
    status: 'ACTIVE',
  },
  {
    id: 'a9414de1-0ae8-4453-a3b1-3237f6a2eec5',
    country_id: kwCountryId,
    name: 'Ahmadi',
    name_ar: 'الأحمدي',
    name_tr: 'Ahmadi',
    status: 'ACTIVE',
  },
];

const neighborhoods = require('./neighborhoods');
const mappings = require('./mappings');

knex
  .transaction(async trx => {
    await Promise.all(
      currencies.map(c =>
        trx.raw(
          `INSERT INTO "currencies" ("id", "name", "code", "code_ar", "decimal_place")
          VALUES ('${c.id}', '${c.name}', '${c.code}', '${c.code_ar}', '${c.decimal_place}')
          ON CONFLICT DO NOTHING;`
        )
      )
    );
    console.log('currencies done!');
    await Promise.all(
      countries.map(c =>
        trx.raw(
          `INSERT INTO "countries" ("id", "currency_id", "name", "name_ar", "name_tr", "status", "dial_code", "iso_code")
          VALUES ('${c.id}', '${c.currency_id}', '${c.name}', '${c.name_ar}', '${c.name_tr}', '${c.status}', '${c.dial_code}', '${c.iso_code}')
          ON CONFLICT DO NOTHING;`
        )
      )
    );
    console.log('countries done!');
    await trx('menus').update({
      country_id: kwCountryId,
    });
    console.log('updated menus countryId');
    await trx('coupons').update({
      country_id: kwCountryId,
    });
    console.log('updated coupons countryId');

    await Promise.all(
      cities.map(c =>
        trx.raw(
          `INSERT INTO "cities" ("id", "country_id", "name", "name_ar", "name_tr", "status")
          VALUES ('${c.id}', '${c.country_id}', '${c.name}', '${c.name_ar}', '${c.name_tr}', '${c.status}')
          ON CONFLICT DO NOTHING;`
        )
      )
    );
    console.log('cities done!');
    await Promise.all(
      neighborhoods.map(neighborhood => {
        return trx('neighborhoods')
          .where({ id: neighborhood.id })
          .update(neighborhood);
      })
    );
    console.log('neighbourhoods updated!');

    await trx.raw(
      `UPDATE order_items SET photo=menu_items.photo FROM menu_items WHERE menu_items.id=order_items.menu_item_id`
    );
    console.log('updated photo on order_items!');

    return trx('brand_location_addresses').then(brandLocationAddresses => {
      return Promise.all(
        brandLocationAddresses.map(async brandLocationAddress => {
          const mapping = find(
            mappings,
            m => m.cityInAddresses === brandLocationAddress.city.trim()
          );
          let cityId = null;
          let neighborhoodId = null;
          if (mapping) {
            const city = find(cities, c => c.name === mapping.city);
            cityId = city ? city.id : null;
            const neighborhood = find(
              neighborhoods,
              c => c.name === mapping.neighborhood
            );
            neighborhoodId = neighborhood ? neighborhood.id : null;
          }
          return Promise.all([
            trx('brand_locations')
              .where({
                id: brandLocationAddress.brand_location_id,
              })
              .update({
                currency_id: kdCurrencyId,
                name: brandLocationAddress.short_address,
                name_ar: brandLocationAddress.short_address_ar,
                name_tr: brandLocationAddress.short_address_tr,
              }),
            trx('brand_location_addresses')
              .where({
                id: brandLocationAddress.id,
              })
              .update({
                city_id: cityId || defaultCityId,
                neighborhood_id: neighborhoodId,
              }),
          ]);
        })
      );
    });
  })
  .then(() => {
    console.log('all done!');
    return knex.destroy();
  })
  .catch(err => {
    console.log('error', err);
    return knex.destroy();
  });
