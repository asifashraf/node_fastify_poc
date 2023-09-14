exports.up = knex =>
  knex.schema.alterTable('countries', table => {
    table.integer('time_zone_offset').default(0);
  });

exports.down = knex =>
  knex.schema.table('countries', table => {
    table.integer('time_zone_offset');
  });
