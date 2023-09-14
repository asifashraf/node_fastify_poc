exports.up = async knex => {
  await knex.schema.alterTable('loyalty_tiers', table => {
    table.specificType('min_amount', 'numeric(13, 3)');
    table.specificType('max_amount', 'numeric(13, 3)');
  });
};

exports.down = async knex => {
  await knex.schema.alterTable('loyalty_tiers', table => {
    table.dropColumn('min_amount');
    table.dropColumn('max_amount');
  });
};
