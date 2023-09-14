/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
const { v4: uuidv4 } = require('uuid');

const config = require('../../../globals/config');

exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('categories').del()
  await knex('category_metadata').del()

  let id1 = uuidv4();
  let id2 = uuidv4();
  let id3 = uuidv4();

  await knex('categories').insert([
    {
      id: id1,
      id_parent: config.default_uuid,
      active: true
    },
    {
      id: id2,
      id_parent: id1,
      active: true
    },
    {
      id: id3,
      id_parent: id1,
      active: true
    },
  ]);

  await knex('category_metadata').insert([
    {
      id: uuidv4(),
      id_category: id1,
      name: "Coffee Makers",
      id_lang: config.languages.en
    },
    {
      id: uuidv4(),
      id_category: id1,
      name: "Coffee Makers Arabic ",
      id_lang: config.languages.ar
    },
    {
      id: uuidv4(),
      id_category: id1,
      name: "Coffee Makers Turkish",
      id_lang: config.languages.tr
    },
    {
      id: uuidv4(),
      id_category: id2,
      name: "Coffee Bags",
      id_lang: config.languages.en
    },
    {
      id: uuidv4(),
      id_category: id2,
      name: "Coffee Bags Arabic ",
      id_lang: config.languages.ar
    },
    {
      id: uuidv4(),
      id_category: id2,
      name: "Coffee Bags Turkish",
      id_lang: config.languages.tr
    },
    {
      id: uuidv4(),
      id_category: id3,
      name: "Coffee Capsules",
      id_lang: config.languages.en
    },
    {
      id: uuidv4(),
      id_category: id3,
      name: "Coffee Capsules Arabic ",
      id_lang: config.languages.ar
    },
    {
      id: uuidv4(),
      id_category: id3,
      name: "Coffee Capsules Turkish",
      id_lang: config.languages.tr
    },
  ]);
};
