/* eslint-disable camelcase */

const casual = require('casual');

module.exports = (brandLocations, brandLocationAdmins) => {
  const adminsToInsert = [];
  Object.keys(brandLocations).forEach(async key => {
    const adminId = brandLocationAdmins[brandLocations[key].email].id;
    adminsToInsert.push({
      id: casual.uuid,
      admin_id: adminId,
      brand_id: brandLocations[key].brand_id,
      brand_location_id: brandLocations[key].id,
    });
  });

  return adminsToInsert;
};
