exports.up = knex =>
  knex.schema.createTable('gift_card_templates_brands', table => {
    table
      .uuid('brand_id')
      .references('id')
      .inTable('brands')
      .index()
      .notNullable()
      .onDelete('CASCADE');
    table
      .uuid('gift_card_template_id')
      .references('id')
      .inTable('gift_card_templates')
      .index()
      .notNullable()
      .onDelete('CASCADE');
    table.unique(['brand_id', 'gift_card_template_id']);  
  });

exports.down = knex => knex.schema.dropTable('gift_card_templates_brands');
