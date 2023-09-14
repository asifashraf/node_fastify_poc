exports.up = knex =>
  knex.schema.createTable('coupons', table => {
    table.uuid('id').primary();
    table.string('code');
    table.specificType('flat_amount', 'numeric(13, 3)');
    table.integer('percentage');
    table.date('start_date');
    table.date('end_date');
    table.boolean('is_valid');
  });

exports.down = knex => knex.schema.dropTable('coupons');
