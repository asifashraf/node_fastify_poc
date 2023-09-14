exports.up = function(knex) {
  return knex.schema.table('coupons', table => {
    table.uuid('created_by').nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.table('coupons', table => {
    table.dropColumn('created_by');
  });
};
