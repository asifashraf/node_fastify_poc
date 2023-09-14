exports.up = knex =>
  knex.schema.table('tags', table => {
    table.string('type').defaultTo('OTHER');
  });

exports.down = knex =>
  knex.schema.table('tags', table => {
    table.dropColumn('type');
});
