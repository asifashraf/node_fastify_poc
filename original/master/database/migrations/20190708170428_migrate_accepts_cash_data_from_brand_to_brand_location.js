// exports.up = knex =>
//   knex('brands').then(rows => {
//     return Promise.all(
//       rows.map(row => {
//         return knex('brand_locations')
//           .where({ brand_id: row.id })
//           .update({ accepts_cash: row.accepts_cash });
//       })
//     );
//   });
exports.up = () => Promise.resolve();
exports.down = () => {};
