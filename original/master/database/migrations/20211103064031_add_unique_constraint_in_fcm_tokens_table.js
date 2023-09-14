exports.up = async knex => {
  await knex.schema.table('fcm_tokens', table => {
    table.unique(['customer_id', 'token']);
  });
};

exports.down = async knex => {
  await knex.schema.table('fcm_tokens', table => {
    table.dropUnique(['customer_id', 'token']);
  });
};
