exports.up = knex =>
  knex.schema
    .table('order_sets', table => {
      table.string('short_id').notNullable();
      table.string('transaction_id').index();
      table.string('note');
      table.specificType('subtotal', 'numeric(13, 3)');
      table.specificType('total', 'numeric(13, 3)');
      table
        .uuid('brand_location_id')
        .references('id')
        .inTable('brand_locations')
        .index()
        .notNullable();
    })
    .table('orders', table => {
      table.dropColumn('number'); //-- short_id
      table.dropColumn('transaction_id');
      table.dropColumn('note');
      table.dropColumn('subtotal');
      table.dropColumn('total');
      table.dropColumn('brand_location_id');
    })
    .table('order_items', table => {
      table
        .uuid('order_set_id')
        .references('id')
        .inTable('order_sets')
        .index()
        .notNullable();
      table.dropColumn('order_id');
    });

exports.down = knex =>
  knex.schema
    .table('order_sets', table => {
      table.dropColumn('short_id'); //-- number
      table.dropColumn('transaction_id');
      table.dropColumn('note');
      table.dropColumn('subtotal');
      table.dropColumn('total');
      table.dropColumn('brand_location_id');
    })
    .table('orders', table => {
      table.string('number').notNullable(); //-- short_id
      table.string('transaction_id');
      table.string('note');
      table.specificType('subtotal', 'numeric(13, 3)');
      table.specificType('total', 'numeric(13, 3)');
      table
        .uuid('brand_location_id')
        .references('id')
        .inTable('brand_locations')
        .index()
        .notNullable();
    })
    .table('order_items', table => {
      table.dropColumn('order_set_id');
      table
        .uuid('order_id')
        .references('id')
        .inTable('orders')
        .notNullable();
    });
