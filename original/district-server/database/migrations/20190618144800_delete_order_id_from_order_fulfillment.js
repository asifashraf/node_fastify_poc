// exports.up = knex =>
//   knex.schema.table('order_fulfillment', table => {
//     table.dropColumn('order_id');
//   });
//
// exports.down = knex =>
//   knex.schema.table('order_fulfillment', table => {
//     table
//       .uuid('order_id')
//       .references('id')
//       .inTable('orders')
//       .index();
//   });
exports.up = knex =>
  knex.raw(
    `ALTER TABLE "order_fulfillment" 
  DROP CONSTRAINT "order_fulfillment_order_id_foreign",
  ALTER COLUMN "order_id" DROP NOT NULL;`
  );
exports.down = () => {};
