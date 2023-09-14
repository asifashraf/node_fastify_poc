exports.up = knex =>
  knex.schema.alterTable('currencies', table => {
    table.specificType('lowest_denomination', 'numeric(13, 3)').defaultTo(0);
  });

exports.down = knex =>
  knex.schema.alterTable('currencies', table => {
    table.dropColumn('lowest_denomination');
  });
