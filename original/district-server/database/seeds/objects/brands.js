/* eslint camelcase: "off" */
const { brandStatus } = require('./../../../src/schema/root/enums');

const brands = {
  caribou: {
    id: '623c9dfc-f2e8-4800-89d8-9f202f6b7f0e',
    name: 'Caribou Coffee',
    name_ar: 'كاريبو كوفي',
    country_id: '01c73b60-2c6a-45f1-8dbf-88a5ce4ad179',
    status: brandStatus.ACTIVE,
    cofe_store: true,
    cofe_store_photo: 'https://i.picsum.photos/id/1060/800/450.jpg',
  },
  costa: {
    id: '82f509cf-7600-4cf3-9ff4-4725e05591cc',
    name: 'Costa Coffee',
    name_ar: 'كوستا كوفي',
    country_id: '01c73b60-2c6a-45f1-8dbf-88a5ce4ad179',
    status: brandStatus.ACTIVE,
    cofe_store: true,
    cofe_store_photo: 'https://i.picsum.photos/id/1060/800/450.jpg',
  },
  starbucks: {
    id: 'aed15607-823c-4a04-b33c-4449f3e68c60',
    name: 'Starbucks',
    name_ar: 'ستاربكس',
    country_id: '47beceb7-b623-44dd-a037-8a9f62da935c',
    status: brandStatus.ACTIVE,
  },
  noMenuBrand: {
    id: '82b0cd94-54ca-4987-852e-e3cba0e012d2',
    name: 'No-Menu Brand',
    name_ar: 'لا القائمة العلامة التجارية',
    country_id: '01c73b60-2c6a-45f1-8dbf-88a5ce4ad179',
    status: brandStatus.ACTIVE,
  },
};

module.exports = () => brands;
