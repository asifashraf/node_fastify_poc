exports.up = knex =>
  knex.schema.table('products', table => {
    table.dropColumn('return_policy');
    table.dropColumn('return_policy_ar');
  });

exports.down = knex =>
  knex.schema.alterTable('products', table => {
    table.string('return_policy');
    table.string('return_policy_ar');
  });
