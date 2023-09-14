exports.up = knex =>
  knex.schema
    .raw(
      'ALTER TABLE ONLY coupons ALTER COLUMN redemption_count SET DEFAULT 0;'
    )
    .then(() =>
      knex.raw(
        'UPDATE coupons set redemption_count = COALESCE(redemption_count,0)'
      )
    );

exports.down = knex =>
  knex.schema.raw(
    'ALTER TABLE ONLY coupons ALTER COLUMN redemption_count DROP DEFAULT;'
  );
