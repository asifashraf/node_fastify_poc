exports.up = knex =>
  knex.schema.table('neighborhoods', table => {
    table
      .string('name_ar')
      .default('')
      .notNullable();
  });

exports.down = knex =>
  knex.schema.table('neighborhoods', table => {
    table.dropColumn('name_ar');
  });
