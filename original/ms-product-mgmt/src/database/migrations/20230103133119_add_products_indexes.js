/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    await knex.schema.table('products', function (table) {
        table.index(['is_varianted']);
    });

    await knex.schema.table('products', function (table) {
        table.index(['active']);
    });

    await knex.schema.table('products', function (table) {
        table.index(['position']);
    });

    await knex.schema.table('products', function (table) {
        table.index(['created_at']);
    });

    await knex.schema.table('product_metadata', function (table) {
        table.index(['name','id_lang']);
    });

    await knex.schema.table('product_metadata', function (table) {
        table.index(['short_description','id_lang']);
    });

    await knex.schema.table('product_suppliers', function (table) {
        table.index(['product_price_tax_excl','product_supplier_reference','id_supplier']);
    });

    await knex.schema.table('product_category', function (table) {
        table.index(['id_category']);
    });

    await knex.schema.table('product_category', function (table) {
        table.index(['position']);
    });

    await knex.schema.table('product_category', function (table) {
        table.index(['id_product']);
    });

    await knex.schema.table('product_countries', function (table) {
        table.index(['id_product']);
    });

    await knex.schema.table('product_countries', function (table) {
        table.index(['id_country']);
    });

    await knex.schema.table('products_wishlist', function (table) {
        table.index(['id_product']);
    });

    await knex.schema.table('product_attributes', function (table) {
        table.index(['id_product','id_supplier','price','reference','default_on']);
    });

    await knex.schema.table('product_stock', function (table) {
        table.index(['id_product_attribute','quantity','allow_backorder']);
    });

    await knex.schema.table('product_attribute_media', function (table) {
        table.index(['id_product_attribute','image']);
    });

    await knex.schema.table('product_media', function (table) {
        table.index(['image','cover','alternate_cover','id_product']);
    });

    await knex.schema.table('product_specific_price', function (table) {
        table.index(['id','reduction','reduction_type','date_to','date_from','id_product','id_product_attribute']);
    });

    await knex.schema.table('product_attribute_combinations', function (table) {
        table.index(['id_product_attribute']);
    });

    await knex.schema.table('attributes', function (table) {
        table.index(['id','position','name','code','id_lang']);
    });

    await knex.schema.table('attribute_groups', function (table) {
        table.index(['name','group_type','id','id_lang']);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
    await knex.schema.table('products', function (table) {
        table.dropIndex(['is_varianted'])
    });

    await knex.schema.table('products', function (table) {
        table.dropIndex(['active'])
    });

    await knex.schema.table('products', function (table) {
        table.dropIndex(['position'])
    });

    await knex.schema.table('products', function (table) {
        table.dropIndex(['created_at'])
    });

    await knex.schema.table('product_metadata', function (table) {
        table.dropIndex(['name','id_lang'])
    });

    await knex.schema.table('product_metadata', function (table) {
        table.dropIndex(['short_description','id_lang'])
    });

    await knex.schema.table('product_suppliers', function (table) {
        table.dropIndex(['product_price_tax_excl','product_supplier_reference','id_supplier'])
    });

    await knex.schema.table('product_category', function (table) {
        table.dropIndex(['id_category'])
    });

    await knex.schema.table('product_category', function (table) {
        table.dropIndex(['position'])
    });

    await knex.schema.table('product_category', function (table) {
        table.dropIndex(['id_product'])
    });

    await knex.schema.table('product_countries', function (table) {
        table.dropIndex(['id_product'])
    });

    await knex.schema.table('product_countries', function (table) {
        table.dropIndex(['id_country'])
    });

    await knex.schema.table('products_wishlist', function (table) {
        table.dropIndex(['id_product'])
    });

    await knex.schema.table('product_attributes', function (table) {
        table.dropIndex(['id_product','id_supplier','price','reference','default_on'])
    });

    await knex.schema.table('product_stock', function (table) {
        table.dropIndex(['id_product_attribute','quantity','allow_backorder'])
    });

    await knex.schema.table('product_attribute_media', function (table) {
        table.dropIndex(['id_product_attribute','image'])
    });

    await knex.schema.table('product_media', function (table) {
        table.dropIndex(['image','cover','alternate_cover','id_product'])
    });

    await knex.schema.table('product_specific_price', function (table) {
        table.dropIndex(['id','reduction','reduction_type','date_to','date_from','id_product','id_product_attribute'])
    });

    await knex.schema.table('product_attribute_combinations', function (table) {
        table.dropIndex(['id_product_attribute'])
    });

    await knex.schema.table('attributes', function (table) {
        table.dropIndex(['id','position','name','code','id_lang']);
    });

    await knex.schema.table('attribute_groups', function (table) {
        table.dropIndex(['name','group_type','id','id_lang']);
    });
};
