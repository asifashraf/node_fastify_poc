exports.up = function (knex) {
  return knex.schema.createTable('tap_customers', table => {
    table.string('customer_id')
      .references('id')
      .inTable('customers')
      .index()
      .notNullable();
    table.string('country_code');
    table.string('customer_token');
    table.timestamps(false, true);
  });
};

exports.down = async function (knex) {
  return knex.schema.dropTable('tap_customers');
};
