exports.up = function (knex) {
  return knex.schema.createTable('customer_account_deletion_request', table => {
    table.uuid('id')
      .primary()
      .notNullable();
    table.string('phone_number')
      .notNullable()
      .index();
    table.string('status')
      .notNullable()
      .defaultTo('SCHEDULED');
    table.uuid('reason')
      .references('id')
      .inTable('customer_account_deletion_reason')
      .index()
      .notNullable();
    table.string('description');
    table.timestamp('created')
      .notNullable()
      .defaultTo(knex.fn.now());
    table.timestamp('updated')
      .notNullable()
      .defaultTo(knex.fn.now());
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTable('customer_account_deletion_request');
};
