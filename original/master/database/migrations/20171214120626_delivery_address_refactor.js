exports.up = knex =>
  knex.schema.table('delivery_addresses', table => {
    // Drop Old Fields
    table.dropColumn('address_1');
    table.dropColumn('address_2');
    table.dropColumn('city');
    table.dropColumn('province');
    table.dropColumn('country');
    table.dropColumn('zip');
    // Add New Fields
    table.string('friendly_name').notNullable();
    table.string('block').notNullable();
    table.string('street').notNullable();
    table.string('avenue');
    table.string('neighborhood_name');
    table.string('street_number').notNullable();
    table.string('type').notNullable();
    table.string('floor');
    table.string('unit_number');
  });

exports.down = knex =>
  knex.schema.table('delivery_addresses', table => {
    table.dropColumn('friendly_name');
    table.dropColumn('block');
    table.dropColumn('street');
    table.dropColumn('avenue');
    table.dropColumn('neighborhood_id');
    table.dropColumn('street_number');
    table.dropColumn('type');
    table.dropColumn('floor');
    table.dropColumn('unit_number');

    table.string('address_1').notNullable();
    table.string('address_2');
    table.string('city').notNullable();
    table.string('province').notNullable();
    table.string('country').notNullable();
    table.string('zip').notNullable();
  });
