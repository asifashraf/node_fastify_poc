exports.up = function (knex) {
    return knex.schema.createTable('categories_countries', table => {
        table
            .uuid('category_id')
            .references('id')
            .inTable('categories')
            .index()
            .notNullable()
            .onDelete('CASCADE');
        table
            .uuid('country_id')
            .references('id')
            .inTable('countries')
            .index()
            .notNullable()
            .onDelete('CASCADE');
        table.unique(['category_id', 'country_id']);      
    });
};
  
exports.down = async function (knex) {
    await knex.schema.dropTable('categories_countries');
};