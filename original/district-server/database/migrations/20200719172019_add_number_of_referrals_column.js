exports.up = knex =>
  knex.schema.alterTable('countries', table => {
    table
      .integer('number_of_allowed_referrals')
      .defaultsTo(20)
      .nullable();
  });

exports.down = knex =>
  knex.schema.alterTable('countries', table => {
    table.dropColumn('number_of_allowed_referrals');
  });
