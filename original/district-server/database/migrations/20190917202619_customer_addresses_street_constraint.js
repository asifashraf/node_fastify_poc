exports.up = knex =>
  knex.raw(
    `ALTER TABLE "customer_addresses"
  ALTER COLUMN "street" DROP NOT NULL;`
  );
exports.down = () => {};
