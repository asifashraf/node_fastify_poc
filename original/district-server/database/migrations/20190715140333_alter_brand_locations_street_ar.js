exports.up = knex =>
  knex.raw(
    `ALTER TABLE "brand_locations" ALTER COLUMN "street_ar" SET DEFAULT '';`
  );
exports.down = knex => {};
