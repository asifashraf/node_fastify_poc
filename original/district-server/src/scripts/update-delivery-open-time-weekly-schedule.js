const knex = require('../../database');
// upgrade
knex.transaction(async trx => {
  await trx.raw(`
  update weekly_schedules set delivery_open_time = open_time + (delivery_time_offset * interval '1 minute'), delivery_open_duration = open_duration - (delivery_time_offset*2) 
where open_all_day = false 
and open_time is not null 
and open_duration is not null 
and delivery_open_time is null;`);

  console.log('done!');
});
