const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = function (knex) {
    return knex.schema.createTable('splash_category_contents', table => {
        table.uuid('id').primary().notNullable();
        table.enu('platform', ['IOS', 'ANDROID'], {
            useNative: true,
            enumName: 'splash_content_platform_enum',
        });
        table.enu('size', ['SMALL', 'MEDIUM', 'LARGE', 'XLARGE'], {
            useNative: true,
            enumName: 'splash_content_size_enum',
        });
        table.enu('language', ['EN', 'AR'], {
            useNative: true,
            enumName: 'splash_content_language_enum',
        });
        table.uuid('category_id').references('id').inTable('splash_category').index().notNullable();
        table.string('url').notNullable();
        table
            .timestamp('created')
            .notNullable()
            .defaultTo(knex.fn.now());
        table
            .timestamp('updated')
            .notNullable()
            .defaultTo(knex.fn.now());
        table.unique(['platform', 'size', 'language', 'category_id']);
    }).then(() => knex.raw(onUpdateTrigger('splash_category_contents')));
};

exports.down = async function (knex) {
    await knex.schema.dropTable('splash_category_contents');
};
