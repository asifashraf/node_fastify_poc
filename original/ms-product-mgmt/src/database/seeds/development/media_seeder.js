const { v4: uuidv4 } = require('uuid');

const config = require("../../../globals/config");
/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('media').del()
  await knex('media').insert([
    {
      id: uuidv4(),
      id_lang: config.languages.en,
      meta_type: "string",
      meta_value: "Image 1",
      meta_key: "legend"
    }
  ]);
};
