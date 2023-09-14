exports.up = async knex => {
  await knex.schema.table('discovery_credits', table => {
    table.unique(['customer_id', 'country_id', 'currency_id']);
  });
};

exports.down = async knex => {
  await knex.schema.table('discovery_credits', table => {
    table.dropUnique(['customer_id', 'country_id', 'currency_id']);
  });
};
