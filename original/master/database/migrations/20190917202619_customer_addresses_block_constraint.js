exports.up = knex =>
  knex.raw(
    `ALTER TABLE "customer_addresses"
  ALTER COLUMN "block" DROP NOT NULL;`
  );
exports.down = () => {};
