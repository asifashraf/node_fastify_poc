exports.up = knex =>
  knex.schema.alterTable('country_configuration', table => {
    table
      .string('type', 20)
      .notNullable()
      .default('');
    table.string('subtype', 20).nullable();
    table
      .boolean('required')
      .notNullable()
      .default(true);
    table.string('options', 500).nullable();
    table
      .string('label', 100)
      .notNullable()
      .default('');
    table.string('validation_type', 100).nullable();
  });

exports.down = knex =>
  knex.schema.table('country_configuration', table => {
    table.dropColumn('type');
    table.dropColumn('subtype');
    table.dropColumn('required');
    table.dropColumn('options');
    table.dropColumn('label');
    table.dropColumn('validation_type');
  });
