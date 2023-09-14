exports.up = knex =>
  knex.schema
    .table('order_sets', table => {
      table
        .uuid('coupon_id')
        .references('id')
        .inTable('coupons')
        .index();
      table.string('merchant_id');
      table.renameColumn('voucher', 'coupon_amount');
    })
    .table('order_items', table => {
      table
        .specificType('price', 'numeric(13, 3)')
        .default(0)
        .notNullable();
    })
    .table('order_statuses', table => {
      table.dropColumn('rejection_reason');
    })
    .createTable('payment_statuses', table => {
      table.uuid('id').primary();
      table
        .uuid('order_set_id')
        .references('id')
        .inTable('order_sets')
        .index()
        .notNullable();
      table
        .datetime('created_at')
        .notNullable()
        .defaultTo(knex.raw('now()'));
      table.string('raw_response', 1024);
      table.string('name').notNullable();
    })
    .createTable('order_set_statuses', table => {
      table.uuid('id').primary();
      table
        .uuid('order_set_id')
        .references('id')
        .inTable('order_sets')
        .index()
        .notNullable();
      table.string('status').notNullable();
      table.string('rejection_reason', 4096);
      table.string('note', 4096);
      table
        .datetime('created_at')
        .notNullable()
        .defaultTo(knex.fn.now());
    });

exports.down = knex =>
  knex.schema
    .table('order_sets', table => {
      table.dropColumn('coupon_id');
      table.dropColumn('merchant_id');
      table.renameColumn('coupon_amount', 'voucher');
    })
    .table('order_items', table => {
      table.dropColumn('price');
    })
    .table('order_statuses', table => {
      table.string('rejection_reason');
      table.string('note');
    })
    .dropTable('payment_statuses')
    .dropTable('order_set_statuses');
