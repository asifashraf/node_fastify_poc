exports.up = knex =>
  knex.schema.table('pickup_locations', table => {
    table.string('name');
  });

exports.down = knex =>
  knex.schema.alterTable('pickup_locations', table => {
    table.dropColumn('name');
  });
