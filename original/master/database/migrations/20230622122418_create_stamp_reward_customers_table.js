const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = function (knex) {
	return knex.schema.createTable('stamp_reward_customers', (table) => {
		table.uuid('id')
			.primary()
			.notNullable();
		table.string('customer_id')
      .references('id')
      .inTable('customers')
      .index()
			.unique()
      .notNullable();
    table.integer('counter_value')
			.defaultTo(0)
			.notNullable();
    table.boolean('claim_status')
			.defaultTo(false)
			.notNullable();
    table
			.timestamp('created')
			.notNullable()
			.defaultTo(knex.fn.now());
		table
			.timestamp('updated')
			.notNullable()
			.defaultTo(knex.fn.now());
    }).then(() => knex.raw(onUpdateTrigger('stamp_reward_customers')));
};

exports.down = function (knex) {
	return knex.schema.dropTable('stamp_reward_customers');
};
