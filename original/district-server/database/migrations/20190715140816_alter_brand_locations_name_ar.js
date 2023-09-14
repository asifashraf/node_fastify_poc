exports.up = knex =>
  knex.raw(
    `ALTER TABLE "brand_locations" ALTER COLUMN "name_ar" SET DEFAULT '';`
  );
exports.down = knex => {};
