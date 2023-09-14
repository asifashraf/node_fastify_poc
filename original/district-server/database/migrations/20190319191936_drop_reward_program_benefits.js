exports.down = knex =>
  knex.schema.createTable('reward_program_benefits', table => {
    table.uuid('id').primary();
    table.string('title').notNullable();
    table.string('type').notNullable();
  });

exports.up = knex => knex.schema.dropTable('reward_program_benefits');
