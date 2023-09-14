/* eslint-disable camelcase */
const casual = require('casual');
const { forEach } = require('lodash');

module.exports = (brandLocations, schedule) => {
  const schedules = [];

  const pushTemplates = (brandLocation, template) => {
    template.forEach(schedule => {
      const copy = Object.assign({}, schedule);
      copy.id = casual.uuid;
      copy.brand_location_id = brandLocation.id;
      schedules.push(copy);
    });
  };

  forEach(brandLocations, brandLocation => {
    pushTemplates(brandLocation, schedule);
  });

  return schedules;
};
