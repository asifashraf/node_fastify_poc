exports.up = knex =>
  knex.schema.alterTable('brands', table => {
    table.specificType('express_delivery_fee', 'numeric(13, 3)').defaultTo(0.0);
  });

exports.down = knex =>
  knex.schema.alterTable('brands', table => {
    table.dropColumn('express_delivery_fee');
  });
