exports.up = knex =>
  knex.schema.raw(
    `ALTER TABLE customer_addresses ADD COLUMN dynamic_data jsonb;`
  );

exports.down = knex =>
  knex.schema.raw(`ALTER TABLE customer_addresses DROP COLUMN dynamic_data;`);
