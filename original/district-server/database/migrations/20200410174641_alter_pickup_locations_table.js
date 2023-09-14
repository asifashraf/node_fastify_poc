exports.up = knex =>
  knex.schema.table('pickup_locations', table => {
    table
      .uuid('city_id')
      .references('id')
      .inTable('cities');
    table
      .uuid('neighborhood_id')
      .references('id')
      .inTable('neighborhoods');
    table.string('street');
    table.string('manager_name');
    table.string('manager_email');
    table.string('manager_phone');
  });

exports.down = knex =>
  knex.schema.alterTable('pickup_locations', table => {
    table.dropColumn('city_id');
    table.dropColumn('neighborhood_id');
    table.dropColumn('street');
    table.dropColumn('manager_name');
    table.dropColumn('manager_email');
    table.dropColumn('manager_phone');
  });
