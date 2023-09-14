exports.up = knex =>
  knex.raw(
    `ALTER TABLE "delivery_addresses"
ALTER COLUMN "block" DROP NOT NULL;`
  );
exports.down = () => {};
