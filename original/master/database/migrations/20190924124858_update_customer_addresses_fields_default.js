exports.up = knex =>
  knex.raw(
    `ALTER TABLE "customer_addresses_fields"
  ALTER COLUMN "type" SET DEFAULT 'OTHER';`
  );
exports.down = () => {};
