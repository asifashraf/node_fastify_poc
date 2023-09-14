/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
const { v4: uuidv4 } = require('uuid');

const config = require('../../../globals/config');

exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('manufacturers').del()
  await knex('manufacturers_metadata').del()

  let id1 = uuidv4();
  let id2 = uuidv4();

  await knex('manufacturers').insert([
    {
      id: id1,
      active: true
    },
    {
      id: id2,
      active: true
    },
  ]);

  await knex('manufacturers_metadata').insert([
    {
      id: uuidv4(),
      id_manufacturer: id1,
      name: "Manufacturer One",
      id_lang: config.languages.en
    },
    {
      id: uuidv4(),
      id_manufacturer: id1,
      name: "Manufacturer One Arabic ",
      id_lang: config.languages.ar
    },
    {
      id: uuidv4(),
      id_manufacturer: id1,
      name: "Manufacturer One Turkish",
      id_lang: config.languages.tr
    },
    {
      id: uuidv4(),
      id_manufacturer: id2,
      name: "Manufacturer Two",
      id_lang: config.languages.en
    },
    {
      id: uuidv4(),
      id_manufacturer: id2,
      name: "Manufacturer Two Arabic ",
      id_lang: config.languages.ar
    },
    {
      id: uuidv4(),
      id_manufacturer: id2,
      name: "Manufacturer One Turkish",
      id_lang: config.languages.tr
    },
  ]);
};
