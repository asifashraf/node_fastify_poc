exports.up = knex =>
  knex.raw(`ALTER TABLE "loyalty_tiers" ALTER COLUMN "bonus" SET DEFAULT 0;`);

exports.down = knex => {};
