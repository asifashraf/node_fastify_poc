const { onUpdateTrigger } = require('../../knexfile.js');
const { stampRewardLogType } = require('../../src/schema/stamp-reward-logs/enums');

exports.up = function (knex) {
	return knex.schema.createTable('stamp_reward_logs', (table) => {
		table.uuid('id')
			.primary()
			.notNullable();
		table.enu('log_type', Object.values(stampRewardLogType), {
			useNative: true,
			enumName: 'stamp_reward_log_type_enum',
			})
			.notNullable();
		table.uuid('reference_order_id')
			.references('id')
      .inTable('order_sets')
      .index()
      .nullable();
	  table.string('reference_customer_id')
			.references('id')
      .inTable('customers')
      .index()
      .nullable();
		table.uuid('reference_admin_id')
			.references('id')
      .inTable('admins')
      .index()
      .nullable();
		table.jsonb('request');
		table.jsonb('response');	
    table
			.timestamp('created')
			.notNullable()
			.defaultTo(knex.fn.now());
		table
			.timestamp('updated')
			.notNullable()
			.defaultTo(knex.fn.now());
    }).then(() => knex.raw(onUpdateTrigger('stamp_reward_logs')));
};

exports.down = function (knex) {
	return knex.schema.dropTable('stamp_reward_logs');
};
