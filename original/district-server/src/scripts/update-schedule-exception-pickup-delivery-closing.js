const knex = require('../../database');
// upgrade
knex.transaction(async trx => {
  await trx.raw(`
  update schedule_exceptions set is_delivery_closed = is_closed;`);

  console.log('done!');
});
