exports.up = knex =>
  knex.schema
    .table('customers', table => {
      table
        .uuid('default_address_id')
        .nullable()
        .alter();
      table
        .string('email')
        .unique()
        .alter();
    })
    .table('addresses', table => {
      table.renameColumn('address1', 'address_1');
      table.renameColumn('address2', 'address_2');
    });

exports.down = knex =>
  knex.schema
    .table('customers', table => {
      table
        .uuid('default_address_id')
        .notNullable()
        .alter();
      table.string('email').alter();
    })
    .table('addresses', table => {
      table.renameColumn('address_1', 'address1');
      table.renameColumn('address_2', 'address2');
    });
