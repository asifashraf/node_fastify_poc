exports.up = knex =>
  knex.schema.table('rewards', table => {
    table
      .string('title_ar')
      .default('')
      .notNullable();
  });

exports.down = knex =>
  knex.schema.table('rewards', table => {
    table.dropColumn('title_ar');
  });
