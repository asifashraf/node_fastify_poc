exports.up = knex =>
  knex.schema.alterTable('countries', table => {
    table.string('service_phone_number');
  });

exports.down = knex =>
  knex.schema.table('countries', table => {
    table.dropColumn('service_phone_number');
  });
