/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
const { v4: uuidv4 } = require('uuid');

const config = require('../../../globals/config');

exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('products').del()
  await knex('product_metadata').del()
  await knex('product_stock').del()
  await knex('product_category').del()
  await knex('product_suppliers').del()
  await knex('product_media').del()

  let id1 = uuidv4();
  let id2 = uuidv4();

  await knex('products').insert([
    {
      id: id1,
      id_manufacturer: 'ca330a16-68fc-4e3e-9559-3ffe3ffbea76',
      reference: 'reference 1',
      id_category_default: '8dc0f227-7307-4433-8b72-fffa08a8c2e9',
    },
    {
      id: id2,
      id_manufacturer: 'ca330a16-68fc-4e3e-9559-3ffe3ffbea76',
      reference: 'reference 2',
      id_category_default: 'd6dde3e8-e606-4a96-b8bd-e70732ecba65',
    }
  ]);

  await knex('product_metadata').insert([
    {
      id: uuidv4(),
      id_product: id1,
      name: "LYCKA Roastery Brazil Fazenda Coffee bags",
      short_description: "Each box have 5 coffee bag",
      id_lang: config.languages.en
    },
    {
      id: uuidv4(),
      id_product: id1,
      name: "LYCKA Roastery Brazil Fazenda Coffee bags Arabic ",
      short_description: "Each box have 5 coffee bag",
      id_lang: config.languages.ar
    },
    {
      id: uuidv4(),
      id_product: id1,
      name: "LYCKA Roastery Brazil Fazenda Coffee bags Turkish",
      short_description: "Each box have 5 coffee bag",
      id_lang: config.languages.tr
    },
    {
      id: uuidv4(),
      id_product: id2,
      name: "Ted Caffe Guji Coffee Bags",
      short_description: "8 Bags each box each bag contains 15 grams of coffee",
      id_lang: config.languages.en
    },
    {
      id: uuidv4(),
      id_product: id2,
      name: "Ted Caffe Guji Coffee Bags Arabic ",
      short_description: "8 Bags each box each bag contains 15 grams of coffee",
      id_lang: config.languages.ar
    },
    {
      id: uuidv4(),
      id_product: id2,
      name: "Ted Caffe Guji Coffee Bags Turkish",
      short_description: "8 Bags each box each bag contains 15 grams of coffee",
      id_lang: config.languages.tr
    }
  ]);

  await knex('product_category').insert([
    {
      id_product: id1,
      id_category: '6d73b03c-f5cb-4d10-a395-8b4830a519e9',
      position: 0
    },
    {
      id_product: id1,
      id_category: 'ab833f19-b1e2-4661-8c37-f8e4c126a135',
      position: 0
    },
    {
      id_product: id2,
      id_category: '6d73b03c-f5cb-4d10-a395-8b4830a519e9',
      position: 0
    },
    {
      id_product: id2,
      id_category: 'ab833f19-b1e2-4661-8c37-f8e4c126a135',
      position: 0
    }
  ]);

  await knex('product_suppliers').insert([
    {
      id: uuidv4(),
      id_product: id1,
      id_product_attribute: config.default_uuid,
      id_supplier: config.default_uuid,
      product_supplier_reference: 'reference 1',
      product_price_tax_excl: '25',
      is_default : true
    },
    {
      id: uuidv4(),
      id_product: id2,
      id_product_attribute: config.default_uuid,
      id_supplier: config.default_uuid,
      product_supplier_reference: 'reference 2',
      product_price_tax_excl: '40',
      is_default : true
    },
  ]);

  await knex('product_stock').insert([
    {
      id: uuidv4(),
      id_product: id1,
      id_product_attribute: config.default_uuid,
      id_supplier: config.default_uuid,
      quantity: 100,
    },
    {
      id: uuidv4(),
      id_product: id1,
      id_product_attribute: config.default_uuid,
      id_supplier: config.default_uuid,
      quantity: 50,
    },
  ]);

  await knex('product_media').insert([
    {
      id: uuidv4(),
      id_product: id1,
      position: 1,
      cover: 1,
    },
    {
      id: uuidv4(),
      id_product: id1,
      position: 2,
      cover: 0,
    },
    {
      id: uuidv4(),
      id_product: id2,
      position: 1,
      cover: 1,
    },
    {
      id: uuidv4(),
      id_product: id2,
      position: 2,
      cover: 0,
    },
  ]);
};
