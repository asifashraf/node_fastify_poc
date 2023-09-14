/* eslint-disable camelcase */

const knex = require('../../database');
const { map } = require('lodash');
const { uuid } = require('../lib/util');

console.log('Running: transfer-weekly-schedules-to-brand-location-weekly-schedule-table.js');

knex
  .transaction(async trx => {
    const weeklySchedules = await knex('weekly_schedules as ws')
    .select('ws.*', 'bl.has_pickup', 'bl.has_delivery', 'bl.allow_express_delivery', 'bl.allow_deliver_to_car')
    .leftJoin('brand_locations as bl', 'bl.id', 'ws.brand_location_id');
    
    console.log('Checking data');
    if (weeklySchedules && Array.isArray(weeklySchedules) && weeklySchedules.length > 0) {
      console.log('Records', weeklySchedules.length);
      const newEntries = map(weeklySchedules, d => {
        const id = uuid.get();
        const pickupScheduleInfo = d.hasPickup ? (d.openAllDay? null : (d.openTime? JSON.stringify([{openTime: d.openTime, openDuration: d.openDuration}]) : null)) :null;
        const carScheduleInfo = d.allowDeliverToCar? (d.openAllDay ? null : (d.openTime? JSON.stringify([{openTime: d.openTime, openDuration: d.openDuration}]) : null)): null;
        const deliveryScheduleInfo = d.hasDelivery ? (d.openAllDay?  null : (d.deliveryOpenTime? JSON.stringify([{openTime: d.deliveryOpenTime, openDuration: d.deliveryOpenDuration}]) : null)):null;
        const expressDeliveryScheduleInfo = d.allowExpressDelivery ? (d.openAllDay ? null : (d.expressDeliveryOpenTime? JSON.stringify([{openTime: d.expressDeliveryOpenTime, openDuration: d.expressDeliveryOpenDuration}]) : null)): null;
        return ({
          id,
          brand_location_id: d.brandLocationId,
          day: (d.day-1),
          pickup_open_all_day: d.openAllDay && d.hasPickup,
          pickup_schedule_info: pickupScheduleInfo,
          car_open_all_day: d.openAllDay && d.allowDeliverToCar,
          car_schedule_info: carScheduleInfo,
          delivery_open_all_day: d.openAllDay && d.hasDelivery,
          delivery_schedule_info: deliveryScheduleInfo,
          express_delivery_open_all_day: d.openAllDay && d.allowExpressDelivery,
          express_delivery_schedule_info: expressDeliveryScheduleInfo,
        })
      });
      const chunkSize = 250;
      await trx.batchInsert('brand_location_weekly_schedules', newEntries, chunkSize)
    } else {
      console.log('Data not found');
    }
  })
  .then(() => {
    console.log('All done!');
    return knex.destroy();
  })
  .catch(err => {
    console.log('error', err);
    return knex.destroy();
  });
