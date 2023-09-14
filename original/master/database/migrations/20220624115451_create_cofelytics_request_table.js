exports.up = function (knex) {
    return knex.schema.createTable('cofelytics_requests', table => {  
        table.uuid('id').primary();
        table
            .uuid('brand_id')
            .references('id')
            .inTable('brands')
            .index()
            .notNullable();
        table
            .uuid('country_id')
            .references('id')
            .inTable('countries')
            .index()
            .notNullable();
        table
            .string('email')
            .notNullable();;        
        table
            .string('status')
            .default('REQUESTED')
            .notNullable();    
        table
            .timestamp('created')
            .notNullable()
            .defaultTo(knex.fn.now());
    });
  };
  
  exports.down = async function (knex) {
    await knex.schema.dropTable('cofelytics_requests');
  };