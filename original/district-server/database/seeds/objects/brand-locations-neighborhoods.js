/* eslint-disable camelcase */
const casual = require('casual');
const { forEach } = require('lodash');
const { sampleSize } = require('../utils');

module.exports = (brandLocations, neighborhoods) => {
  const relations = [];

  forEach(brandLocations, brandLocation => {
    const relationNeighborhoods = sampleSize(
      neighborhoods.filter(
        neighborhood =>
          neighborhood.id !== brandLocations.primary_neighborhood_id
      ),
      casual.integer(0, 2)
    );
    relationNeighborhoods.forEach(neighborhood => {
      relations.push({
        neighborhood_id: neighborhood.id,
        brand_location_id: brandLocation.id,
      });
    });
  });
  return relations;
};
