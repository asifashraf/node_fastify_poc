/* eslint-disable camelcase */
const currencies = {
  aed: {
    id: 'c2f7dbe8-614e-42e8-96a2-4fcea9c631e3',
    name: 'United Arab Emirates Dirham',
    symbol: 'AED',
    symbol_ar: 'د.إ',
    decimal_place: '2',
    lowest_denomination: '0.250',
    status: 'ACTIVE',
    iso_code: 'AED',
  },
  kd: {
    id: 'f216d955-0df1-475d-a9ec-08cb6c0f92bb',
    name: 'Kuwaiti Dinar',
    symbol: 'KWD',
    symbol_ar: 'د.ك',
    decimal_place: '3',
    lowest_denomination: '0.005',
    status: 'ACTIVE',
    iso_code: 'KWD',
  },
  sar: {
    id: 'bc7229c9-7cd7-4507-ad2a-f3dec15e5c47',
    name: 'Saudi Riyal',
    symbol: 'SAR',
    symbol_ar: 'ر.س',
    decimal_place: '2',
    lowest_denomination: '0.250',
    status: 'ACTIVE',
    iso_code: 'SAR',
  },
  gbp: {
    id: 'd85e3d7a-629a-4d76-bf06-a3c83811e7ac',
    name: 'Pound Sterling',
    symbol: 'GBP',
    symbol_ar: 'GBP',
    decimal_place: 2,
    lowest_denomination: 0.1,
    subunit_name: 'p',
    subunit_name_ar: 'p',
    status: 'ACTIVE',
    iso_code: 'GBP',
  },
};
module.exports = () => currencies;
