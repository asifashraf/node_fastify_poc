exports.up = knex =>
  knex.schema.alterTable('customers', table => {
    table.index(['autho_id']);
  });

exports.down = knex =>
  knex.schema.alterTable('customers', table => {
    table.dropIndex(['autho_id']);
  });
