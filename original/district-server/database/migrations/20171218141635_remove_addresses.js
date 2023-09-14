exports.up = knex => knex.schema.dropTable('addresses');

exports.down = knex =>
  knex.schema
    .createTable('addresses', table => {
      table.uuid('id').primary();
      table.string('address_1').notNullable();
      table.string('address_2');
      table.string('city').notNullable();
      table.string('province').notNullable();
      table.string('country').notNullable();
      table.string('zip').notNullable();
    })
    .raw(
      'ALTER TABLE "public"."addresses" ADD COLUMN "geolocation" geometry(Point,4326);'
    );
