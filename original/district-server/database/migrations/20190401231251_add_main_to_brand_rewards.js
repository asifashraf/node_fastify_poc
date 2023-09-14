exports.up = knex =>
  knex.schema.table('brands_rewards', table => {
    table.boolean('main').default(true);
  });

exports.down = knex =>
  knex.schema.table('brands_rewards', table => {
    table.dropColumn('main');
  });
