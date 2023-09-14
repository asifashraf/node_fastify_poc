exports.up = knex =>
  knex.schema.table('brands', table => {
    table
      .string('name_ar')
      .default('')
      .notNullable();
  });

exports.down = knex =>
  knex.schema.table('brands', table => {
    table.dropColumn('name_ar');
  });
