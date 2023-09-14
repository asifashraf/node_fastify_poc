exports.up = knex =>
  knex.raw(
    `ALTER TABLE "customer_addresses"
  ALTER COLUMN "type" DROP NOT NULL;`
  );
exports.down = () => {};
