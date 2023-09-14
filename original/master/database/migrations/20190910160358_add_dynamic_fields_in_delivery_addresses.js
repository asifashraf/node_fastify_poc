exports.up = knex =>
  knex.schema.raw(
    `ALTER TABLE delivery_addresses ADD COLUMN dynamic_data jsonb;`
  );

exports.down = knex =>
  knex.schema.raw(`ALTER TABLE delivery_addresses DROP COLUMN dynamic_data;`);
