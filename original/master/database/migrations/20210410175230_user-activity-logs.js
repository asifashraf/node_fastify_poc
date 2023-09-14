exports.up = knex =>
  knex.schema.createTable('user_activity_logs', table => {
    table.uuid('id').primary();
    table.string('reference_user_id').index();
    table.string('src_platform').nullable();
    table.string('ip').nullable();
    table.string('agent').nullable();
    table
      .string('stream_id')
      .index()
      .nullable();
    table
      .string('stream')
      .nullable()
      .index();
    table.string('action').nullable();
    table.string('operation_name').nullable();
    table.jsonb('input_variables').nullable();
    table.string('query').nullable();
    table
      .timestamp('created')
      .notNullable()
      .defaultTo(knex.fn.now())
      .index();
  });

exports.down = knex => knex.schema.dropTable('user_activity_logs');
