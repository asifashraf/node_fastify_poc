exports.up = knex =>
  knex.schema.alterTable('countries', table => {
    table.specificType('delivery_fee', 'numeric(13, 3)').defaultTo(1);
    table.specificType('service_fee', 'numeric(13, 3)').defaultTo(0);
  });

exports.down = knex =>
  knex.schema.alterTable('countries', table => {
    table.dropColumn('delivery_fee');
    table.dropColumn('service_fee');
  });
