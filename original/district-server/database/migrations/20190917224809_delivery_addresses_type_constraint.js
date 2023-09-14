exports.up = knex =>
  knex.raw(
    `ALTER TABLE "delivery_addresses"
  ALTER COLUMN "type" DROP NOT NULL;`
  );
exports.down = () => {};
