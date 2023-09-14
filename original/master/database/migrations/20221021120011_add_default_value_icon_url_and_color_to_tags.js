exports.up = knex =>
  knex.schema.alterTable('tags', table => {
    table.string('text_color').notNullable().defaultTo('#FFFFFF').alter();
    table.string('background_color').notNullable().defaultTo('#8D2C90').alter();
    table.string('icon_url').notNullable().defaultTo('').alter();
  });

exports.down = knex =>
  knex.schema.alterTable('tags', table => {
  });
