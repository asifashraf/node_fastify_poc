exports.up = function(knex) {
  return knex.schema.alterTable('common_content', table => {
    table.boolean('is_show_title')
          .defaultTo(false).alter();
          table.boolean('is_dropdown')
          .defaultTo(false).alter();
          table.boolean('is_show_icon')
          .defaultTo(false).alter();
          table.boolean('is_show_subtitle')
          .defaultTo(false).alter();
          table.boolean('is_show_description')
          .defaultTo(false).alter();
  });
};

exports.down = function(knex)   {
  return knex.schema.raw('alter table common_content alter column is_show_title drop default')
  .raw('alter table common_content alter column is_dropdown drop default')
  .raw('alter table common_content alter column is_show_icon drop default')
  .raw('alter table common_content alter column is_show_subtitle drop default')
  .raw('alter table common_content alter column is_show_description drop default');
};
