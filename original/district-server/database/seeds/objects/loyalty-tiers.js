/* eslint-disable camelcase */
const casual = require('casual');

module.exports = (countries, currencies) => [
  {
    id: casual.uuid,
    name: 'GREEN',
    amount: '10.000',
    color_tint: '0DBEAF',
    sku: '10KD',
    country_id: countries.kuwait.id,
    currency_id: currencies.kd.id,
  },
  {
    id: casual.uuid,
    name: 'GOLD',
    amount: '20.000',
    color_tint: 'D3BF39',
    sku: '20KD',
    country_id: countries.kuwait.id,
    currency_id: currencies.kd.id,
  },
  {
    id: casual.uuid,
    name: 'BLACK',
    amount: '30.000',
    color_tint: '000000',
    sku: '30KD',
    country_id: countries.kuwait.id,
    currency_id: currencies.kd.id,
  },
  {
    id: casual.uuid,
    name: 'PINK',
    custom_amount: true,
    color_tint: 'E55EA2',
    sku: 'TOPUP',
    country_id: countries.kuwait.id,
    currency_id: currencies.kd.id,
  },
  {
    id: casual.uuid,
    name: 'GREEN SA',
    amount: '10.000',
    color_tint: '0DBEAF',
    sku: '10SAR',
    country_id: countries.saudi_arabia.id,
    currency_id: currencies.sar.id,
  },
  {
    id: casual.uuid,
    name: 'GOLD SA',
    amount: '20.000',
    color_tint: 'D3BF39',
    sku: '20SAR',
    country_id: countries.saudi_arabia.id,
    currency_id: currencies.sar.id,
  },
  {
    id: casual.uuid,
    name: 'BLACK SA',
    amount: '30.000',
    color_tint: '000000',
    bonus: '0.000',
    sku: '30SAR',
    country_id: countries.saudi_arabia.id,
    currency_id: currencies.sar.id,
  },

  {
    id: '3eb0abea-389b-11eb-adc1-0242ac120002',
    name: 'CUSTOM',
    amount: '0',
    color_tint: '0DBEAF',
    sku: 'CustomUAE',
    country_id: countries.emirates.id,
    currency_id: currencies.aed.id,
  },
  {
    id: '3eb0af5a-389b-11eb-adc1-0242ac120002',
    name: 'BLACK',
    amount: '300',
    color_tint: 'D3BF39',
    sku: 'BlackUAE',
    country_id: countries.emirates.id,
    currency_id: currencies.aed.id,
  },
  {
    id: '3eb0b090-389b-11eb-adc1-0242ac120002',
    name: 'GOLD',
    amount: '200',
    color_tint: '000000',
    sku: 'GoldUAE',
    country_id: countries.emirates.id,
    currency_id: currencies.aed.id,
  },
  {
    id: '3eb0b216-389b-11eb-adc1-0242ac120002',
    name: 'GREEN',
    amount: '100',
    color_tint: '000000',
    sku: 'GreenUAE',
    country_id: countries.emirates.id,
    currency_id: currencies.aed.id,
  },
];