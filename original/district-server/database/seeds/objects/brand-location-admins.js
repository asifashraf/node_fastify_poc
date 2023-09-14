/* eslint-disable camelcase */

const casual = require('casual');

module.exports = brandLocations => {
  const adminsToInsert = {};
  Object.keys(brandLocations).forEach(async key => {
    const admin = brandLocations[key];
    adminsToInsert[admin.email] = {
      id: casual.uuid,
      autho_id: casual.uuid,
      name: admin.contact_name,
      email: admin.email,
    };
  });

  return adminsToInsert;
};
