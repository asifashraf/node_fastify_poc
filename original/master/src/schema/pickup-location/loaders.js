const DataLoader = require('dataloader');
const { map, first } = require('lodash');

function createLoaders(model) {
  return {
    byId: new DataLoader(async locationIds => {
      const locations = await model.db.from(model.tableName).select(
        model.db.raw(`${model.tableName}.*,
        ST_X(${model.tableName}.geolocation) as longitude,
        ST_Y(${model.tableName}.geolocation) as latitude`)
      );
      return map(locationIds, locationId =>
        first(locations.filter(location => location.id === locationId))
      );
    }),
  };
}

module.exports = { createLoaders };
