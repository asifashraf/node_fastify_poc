exports.up = knex =>
  knex.raw(
    `ALTER TABLE "delivery_addresses"
ALTER COLUMN "street" DROP NOT NULL;`
  );
exports.down = () => {};
