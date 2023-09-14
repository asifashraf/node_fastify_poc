exports.up = knex =>
  knex.raw(
    `ALTER TABLE "delivery_addresses"
ALTER COLUMN "neighborhood_id" DROP NOT NULL;`
  );
exports.down = () => {};
