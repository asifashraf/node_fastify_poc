exports.up = knex =>
  knex.raw(
    `ALTER TABLE "customer_addresses"
  ALTER COLUMN "neighborhood_id" DROP NOT NULL;`
  );
exports.down = () => {};
