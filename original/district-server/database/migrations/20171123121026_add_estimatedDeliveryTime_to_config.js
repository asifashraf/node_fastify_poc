exports.up = knex =>
  knex.schema.table('configuration', table => {
    table.string('estimated_delivery_time').notNullable();
  });

exports.down = knex =>
  knex.schema.table('configuration', table => {
    table.dropColumn('estimated_delivery_time');
  });
