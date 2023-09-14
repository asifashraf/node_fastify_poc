/* eslint-disable camelcase */
const casual = require('casual');
const { forEach, keys } = require('lodash');
const { sampleSize } = require('../utils');

module.exports = (nutritionalInfo, allergens) => {
  const relations = [];

  forEach(nutritionalInfo, info => {
    const sampledAllergens = sampleSize(
      allergens,
      casual.integer(0, keys(allergens).length)
    );

    sampledAllergens.forEach(alergen => {
      relations.push({
        nutritional_info_id: info.id,
        allergen_id: alergen.id,
      });
    });
  });
  return relations;
};
