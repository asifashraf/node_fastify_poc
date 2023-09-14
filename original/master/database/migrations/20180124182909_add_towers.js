exports.up = knex =>
  knex.schema
    .createTable('towers', table => {
      table.uuid('id').primary();
      table.string('name').notNullable();
    })
    .alterTable('delivery_addresses', table => {
      table.string('building_name').nullable();
    })
    .raw(
      `ALTER TABLE delivery_addresses ALTER COLUMN friendly_name DROP NOT NULL;`
    )
    .raw(`ALTER TABLE delivery_addresses ALTER COLUMN block DROP NOT NULL;`)
    .raw(`ALTER TABLE delivery_addresses ALTER COLUMN street DROP NOT NULL;`)
    .raw(
      `ALTER TABLE delivery_addresses ALTER COLUMN street_number DROP NOT NULL;`
    )
    .raw(
      `ALTER TABLE delivery_addresses ALTER COLUMN friendly_name DROP NOT NULL;`
    );

exports.down = knex => knex.schema.dropTable('towers');
