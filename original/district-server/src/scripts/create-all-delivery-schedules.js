const db = require('../../database');
const Promise = require('bluebird');
const { assign, map, pick, flatten } = require('lodash');
const DeliverySchedule = require('../schema/delivery-schedule/model');

async function run(db) {
  const allBrandLocations = await getAllBrandLocations(db);
  const cofeSchedule = await getCofeSchedule(db);
  const deliveryScheduleModel = new DeliverySchedule(db, this);

  console.log(
    `Got ${allBrandLocations.length} Brand Locations. Will now save/update the Delivery Schedules`
  );

  const deliverySchedulesList = flatten(
    map(allBrandLocations, brandLocation => {
      const brandLocationId = brandLocation.id;

      deleteForCurrentLocation(db, brandLocationId);

      return map(cofeSchedule, schedule =>
        assign(
          {},
          pick(schedule, ['day', 'open_time', 'open_duration', 'open_all_day']),
          {
            // eslint-disable-next-line
            brand_location_id: brandLocationId,
          }
        )
      );
    })
  );

  Promise.all(
    map(deliverySchedulesList, async schedule => {
      return deliveryScheduleModel.save(schedule);
    })
  ).then(() => {
    console.log('Process Complete. Have a nice day');
    db.destroy();
    // eslint-disable-next-line
    process.exit();
  });
}

function getCofeSchedule(db) {
  return db('cofe_district_weekly_schedule');
}

function deleteForCurrentLocation(db, brandLocationId) {
  return db('delivery_schedules')
    .where('brand_location_id', brandLocationId)
    .delete()
    .then(() => {});
}
function getAllBrandLocations(db) {
  return db('brand_locations');
}

run(db);
