exports.up = knex =>
  knex.schema.createTable('country_configuration', table => {
    table.uuid('id').primary();
    table
      .uuid('country_id')
      .references('id')
      .inTable('countries');
    table
      .timestamp('created')
      .notNullable()
      .defaultTo(knex.fn.now());
    table
      .timestamp('updated')
      .notNullable()
      .defaultTo(knex.fn.now());
    table.string('configuration_key').notNullable();
    table.string('configuration_value').notNullable();
    table.string('description');
    table.bool('enabled');
  });

exports.down = knex => knex.schema.dropTable('country_configuration');
