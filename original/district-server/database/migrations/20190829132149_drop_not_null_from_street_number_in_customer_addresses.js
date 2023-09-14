exports.up = knex =>
  knex.raw(
    `ALTER TABLE "customer_addresses" 
  ALTER COLUMN "street_number" DROP NOT NULL;`
  );
exports.down = () => {};
