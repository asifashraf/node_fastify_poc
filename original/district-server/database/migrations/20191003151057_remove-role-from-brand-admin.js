exports.up = knex =>
  knex.schema.table('brand_admins', table => {
    table.dropColumn('role');
  });

exports.down = knex =>
  knex.schema.table('brand_admins', table => {
    table.string('role', 32).defaultTo(null);
  });
