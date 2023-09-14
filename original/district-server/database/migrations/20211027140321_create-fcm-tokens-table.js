exports.up = function (knex) {
  return knex.schema.createTable('fcm_tokens', table => {
    table.uuid('id').primary();
    table
      .string('customer_id')
      .references('id')
      .inTable('customers')
      .index()
      .notNullable();
    table.string('device_id', 255).notNullable();
    table.string('token', 255).notNullable();
    table
      .timestamp('created_at')
      .notNullable()
      .defaultTo(knex.fn.now());
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTable('fcm_tokens');
};
