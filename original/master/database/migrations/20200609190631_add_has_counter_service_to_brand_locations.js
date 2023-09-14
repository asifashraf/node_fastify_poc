exports.up = knex =>
  knex.schema.table('brand_locations', table => {
    table.boolean('has_counter_service').defaultTo(true);
  });

exports.down = knex =>
  knex.schema.alterTable('brand_locations', table => {
    table.dropColumn('has_counter_service');
  });
