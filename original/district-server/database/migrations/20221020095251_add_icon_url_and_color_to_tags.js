exports.up = knex =>
  knex.schema.table('tags', table => {
    table.string('text_color').defaultTo('#FFFFFF');
    table.string('icon_url').defaultTo('');
    table.string('icon_url_ar');
    table.string('icon_url_tr');
    table.string('background_color').defaultTo('#8D2C90');
  });

exports.down = knex =>
  knex.schema.table('tags', table => {
    table.dropColumn('text_color');
    table.dropColumn('icon_url');
    table.dropColumn('icon_url_ar');
    table.dropColumn('icon_url_tr');
    table.dropColumn('background_color');
  });
