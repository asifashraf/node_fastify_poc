exports.up = function (knex) {
  return knex.schema.createTable('tags', table => {
    table.uuid('id').primary().notNullable();
    table.string('name', 140).notNullable();
    table.string('name_ar', 140);
    table.string('name_tr', 140);
    table.string('description', 140).notNullable();
    table.string('description_ar', 140);
    table.string('description_tr', 140);
    table.string('status').default('ACTIVE').notNullable();
    table
      .timestamp('created')
      .notNullable()
      .defaultTo(knex.fn.now());
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTable('tags');
};
