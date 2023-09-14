// exports.up = knex =>
//   knex.schema.table('brands', table => {
//     table.dropColumn('accepts_cash');
//   });
//
// exports.down = knex =>
//   knex.schema.table('brands', table => {
//     table
//       .boolean('accepts_cash')
//       .defaultTo(false)
//       .notNullable();
//   });

exports.up = () => Promise.resolve();
exports.down = () => {};
