exports.up = function(knex) {
  return knex.schema.table('coupons', table => {
    table.string('updated_by').nullable();
    table.dateTime('updated_at').nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.table('coupons', table => {
    table.dropColumn('updated_by');
    table.dropColumn('updated_at');
  });
};
