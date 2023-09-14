/* eslint-disable camelcase */

const knex = require('../../database');
const { map } = require('lodash');
const { uuid } = require('../lib/util');

console.log('Running: transfer-schedule-exceptions-to-brand-location-schedule-exceptions-table.js');

knex
  .transaction(async trx => {
    const scheduleExceptions = await knex('schedule_exceptions as se')
    .select('se.*', 'bl.has_pickup', 'bl.has_delivery', 'bl.allow_express_delivery', 'bl.allow_deliver_to_car')
    .leftJoin('brand_locations as bl', 'bl.id', 'se.brand_location_id')
    .leftJoin('brands as b', 'b.id', 'bl.brand_id')
    .where('b.status', 'ACTIVE')
    .andWhere('bl.status', 'ACTIVE')
    .andWhereRaw('se.end_time > now()');
    
    console.log('Checking data');
    if (scheduleExceptions && Array.isArray(scheduleExceptions) && scheduleExceptions.length > 0) {
      console.log('Records', scheduleExceptions.length);
      const newEntries = map(scheduleExceptions, d => {
        const id = uuid.get();
        return ({
          id,
          brand_location_id: d.brandLocationId,
          status: true,
          is_closed: true,
          start_time: d.startTime,
          end_time: d.endTime,
          pickup: d.hasPickup && d.isClosed,
          car: d.allowDeliverToCar && d.isClosed,
          delivery: d.hasDelivery && d.isDeliveryClosed,
          express_delivery: d.allowExpressDelivery && d.isExpressDeliveryClosed
        })
      });
      const chunkSize = 250;
      await trx.batchInsert('brand_location_schedule_exceptions', newEntries, chunkSize)
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
