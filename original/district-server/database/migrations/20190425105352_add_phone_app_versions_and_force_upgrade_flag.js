exports.up = knex =>
  knex.schema.table('configuration', table => {
    table.string('ios_version', 32).default('1.0.0');
    table.boolean('ios_force_update').default(false);
    table.string('android_version', 32).default('1.0.0');
    table.boolean('android_force_update').default(false);
  });

exports.down = knex =>
  knex.schema.table('configuration', table => {
    table.dropColumn('ios_version');
    table.dropColumn('ios_force_update');
    table.dropColumn('android_version');
    table.dropColumn('android_force_update');
  });
