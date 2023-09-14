const knex = require('../../database');

knex.transaction(async trx => {
  await trx.raw(`
  insert into order_comments
  select
    uuid_generate_v4() as id,
    '2000-01-01 00:00:00' as created,
    order_sets.note as comment,
    order_sets.id as order_set_id,
    null as user_name,
    null as avatar
  from order_sets`);
  console.log('done!');
});
