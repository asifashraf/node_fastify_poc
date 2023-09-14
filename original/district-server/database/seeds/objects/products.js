/* eslint-disable camelcase */

const { statusTypes } = require('../../../src/schema/root/enums');

module.exports = brands => {
  const products = {
    prod_1: {
      id: '9761a7cf-61af-4fc6-889a-c13e536b277f',
      brand_id: brands.caribou.id,
      status: statusTypes.ACTIVE,
      name: 'product 1',
      name_ar: 'product 1 ar',
      description: 'product 1 description',
      description_ar: 'product 1 ar description',
      price: '9.000',
      compare_at_price: '10.000',
      express: true,
      warranty: 24,
      sku: 'SKU1',
      barcode: '123456788',
    },
    prod_2: {
      id: 'd4a2522d-646b-44b5-91fb-d198f4691dbe',
      brand_id: brands.caribou.id,
      status: statusTypes.ACTIVE,
      name: 'product 2',
      name_ar: 'product 2 ar',
      description: 'product 2 description',
      description_ar: 'product 2 ar description',
      price: '5.000',
      compare_at_price: '0',
      sku: 'SKU2',
      barcode: '123456789',
    },
    prod_3: {
      id: '550556d1-0b98-486e-86b3-0c249c340441',
      brand_id: brands.costa.id,
      status: statusTypes.ACTIVE,
      name: 'product 3',
      name_ar: 'product 3car',
      description: 'product 3 description',
      description_ar: 'product 3 ar description',
      price: '6.000',
      compare_at_price: '0',
      sku: 'SKU3',
      barcode: '1234567890',
    },
    prod_4: {
      id: 'ab0810c7-c176-4fb7-a5b1-24eea333094d',
      brand_id: brands.costa.id,
      status: statusTypes.ACTIVE,
      name: 'product 4',
      name_ar: 'product 4 ar',
      description: 'product 4 description',
      description_ar: 'product 4 ar description',
      price: '8.000',
      compare_at_price: '8.500',
      sku: 'SKU4',
      barcode: '1234567891',
    },
  };

  return products;
};
