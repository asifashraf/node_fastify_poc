exports.up = function(knex) {
    return knex.schema.table('brands', table => {
      table.boolean('maintenance').defaultTo('false');
    });
};
  
exports.down = function(knex) {
    return knex.schema.table('brands', table => {
      table.dropColumn('maintenance');
    })
};