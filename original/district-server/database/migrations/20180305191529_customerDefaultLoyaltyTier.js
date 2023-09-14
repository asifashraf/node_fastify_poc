exports.up = knex =>
  knex.schema
    .raw(
      `ALTER TABLE ONLY customers ALTER COLUMN loyalty_tier SET DEFAULT 'GREEN';`
    )
    .then(() =>
      knex.raw(
        `UPDATE customers set loyalty_tier = 'GREEN' where loyalty_tier is null or loyalty_tier = ''`
      )
    );

exports.down = knex =>
  knex.schema.raw(
    'ALTER TABLE ONLY customers ALTER COLUMN loyalty_tier DROP DEFAULT;'
  );
