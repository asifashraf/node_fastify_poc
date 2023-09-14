exports.up = knex =>
  knex.schema.alterTable('coupons', table => {
    table
      .string('created_by')
      .nullable()
      .alter();
  });

exports.down = knex =>
  knex.schema.alterTable('coupons', table => {
    table
      .uuid('created_by')
      .nullable()
      .alter();
  });
