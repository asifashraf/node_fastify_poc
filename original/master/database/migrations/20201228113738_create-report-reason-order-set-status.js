exports.up = knex =>
  knex.schema.alterTable('order_set_statuses', table => {
    table.string('report_reason');
  });

exports.down = knex =>
  knex.schema.alterTable('order_set_statuses', table => {
    table.dropColumn('report_reason');
  });
