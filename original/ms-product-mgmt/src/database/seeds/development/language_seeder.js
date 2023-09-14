/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
const { v4: uuidv4 } = require('uuid');


exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('languages').del()
  await knex('languages').insert([
    {
      id: uuidv4(),
      name: "English",
      active: true,
      iso_code: "EN",
      locale: "en"
     },
    {
      id: uuidv4(),
      name: "Arabic",
      active: true,
      iso_code: "AR",
      locale: "ar"
    },
    {
      id: uuidv4(),
      name: "Turkish",
      active: true,
      iso_code: "TR",
      locale: "tr"
    }
  ]);
};
