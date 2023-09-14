module.exports = function MdlProductSort(opts) {

    const { config, baseModel, moment } = opts;

    const model = baseModel('products');

    const { default_uuid, languages } = config;

    const { link } = model;

    model.sortProducts = async function sortProducts() {

        /*
         * -------------------------------------------------------------------
         * Positioning/sorting products according to the categories
         * Here, the position will set in "product_category" table.
         * -------------------------------------------------------------------
         */

        const countries = [ 'KSA', 'UAE', 'KWT' ];

        let categories = await this.getAllCategories();

        let _categories = categories.map(async (item) => {

            // Fetching products according to category hierarchy
            
            for (const country of countries) {
                
                let products = await link.select('pq.id_product', 'pq.id_product_attribute', 'pq.quantity')
                    .from('products as p')
                    .innerJoin('product_countries as pcc', 'p.id', 'pcc.id_product')
                    .innerJoin('product_category as pc', 'p.id', 'pc.id_product')
                    .innerJoin('product_stock as pq', 'p.id', 'pq.id_product')
                    .where( {'pcc.country_name': country, 'p.active': true, 'pc.auto_update': true })
                    .whereIn('pc.id_category', item.childCategories)
                    .whereNull('p.deleted_at')
                    .orderBy('pq.quantity', 'desc')

                let finalProductIds = await this.getSortedProducts(products);

                for (const [index, value] of finalProductIds.entries()) {
                    
                    let finalCategoryIds = item.childCategories;

                    finalCategoryIds.push(item.id);

                    await link('product_category')
                        .where('id_product', value)
                        .whereIn('id_category', finalCategoryIds)
                        .update({ position: index+1 })
                }
                
            }

            return item;
        });

        categories = await Promise.all(_categories);

        /*
         * -------------------------------------------------------------------
         * Sorting products according to manufacturers which is treated as general sorting
         * Here, the position will set directly in "products" table.
         * -------------------------------------------------------------------
         */

        let manufacturers = await link
            .from('manufacturers as m')
            .innerJoin('manufacturers_metadata as mm', 'm.id', 'mm.id_manufacturer')
            .where({ 'mm.id_lang': languages.en, 'm.active': true })
            .whereNull('m.deleted_at')
            .orderBy('m.created_at', 'desc')
            .pluck('m.id')


        let nonUpdatedProducts = await link.from('product_category as pc')
            .where('pc.auto_update', false ).groupBy('id_product').pluck('pc.id_product')

        let _brands = manufacturers.map(async (brand) => {
        
            for (const country of countries) {

                let products = await link.select('pq.id_product', 'pq.id_product_attribute', 'pq.quantity')
                    .from('products as p')
                    .innerJoin('product_countries as pcc', 'p.id', 'pcc.id_product')
                    .innerJoin('product_stock as pq', 'p.id', 'pq.id_product')
                    .where( {'pcc.country_name': country, 'p.active': true, 'p.id_manufacturer': brand })
                    .whereNotIn('p.id', nonUpdatedProducts)
                    .whereNull('p.deleted_at')
                    .orderBy('pq.quantity', 'desc')
            
                let brandSortedIds = await this.getSortedProducts(products);

                for (const [index, value] of brandSortedIds.entries()) {
                    await link('products').where('id', value).update({ position: index+1 })
                }
            }

            return brand;
        });

        manufacturers = await Promise.all(_brands);

        return { "data": manufacturers };
    }

    /** Get All Subcategories with respect to the parent category id */

    model.getAllCategories = async function getAllCategories(id_parent = default_uuid) {

        let _link = link.select('c.id').from('categories as c')
            .innerJoin('category_metadata as cm', 'c.id', 'cm.id_category')
            .where({ 'c.id_parent': id_parent, 'c.active': true, 'cm.id_lang': languages.en })
            .whereNull('c.deleted_at')

        let categories = await _link;
        
        let _categories = categories.map(async (item) => {
            
            let _subCat = link.from('categories as c')
                .innerJoin('category_metadata as cm', 'c.id', 'cm.id_category')
                .where({ 'c.id_parent': item.id, 'c.active': true, 'cm.id_lang': languages.en })
                .whereNull('c.deleted_at').pluck('c.id')

            item.childCategories = await _subCat;

            return item;
        });

        categories = await Promise.all(_categories);

        return categories;
    }

    model.getSortedProducts = async function getSortedProducts(products) {

        // Get Records From Product Stock to check the availability of products
                    
        let inStockProducts = [];
        let outOfStockProducts = [];

        if (products.length > 0) {

            for (const product of products) {

                product.available = false;

                if (product.quantity > 0 || product.allow_backorder == true) {
                    product.available = true;
                    
                    if (!inStockProducts.includes(product.id_product)) {
                        inStockProducts.push(product.id_product);
                    }

                } else {
                    if (!outOfStockProducts.includes(product.id_product)) {
                        outOfStockProducts.push(product.id_product);
                    }
                }
            }
        }

        // Filter out the IDs that are present in both arrays
        const filteredOutOfStockIds = outOfStockProducts.filter(id => !inStockProducts.includes(id));

        // fetch the In Stock products has discounts and group them into discounted/Non-discounted.
        let inStockDiscountedProductIds = [];
        let inStockNonDiscountedProductIds = [];

        if (inStockProducts.length > 0) {

            let now = moment();
            let formatted = now.format('YYYY-MM-DD HH:mm:ss');

            let productSpecificPrices = await link
                .from('product_specific_price as psp')
                .where(function (q) {
                    q.where(function (q) {
                        q.where('psp.date_from', '<=', formatted).where('psp.date_to', '>=', formatted)
                            .where( 'reduction', '>', 0).where({ 'active': true, 'id_cart': default_uuid})
                    }).orWhereNull('psp.date_from','psp.date_to')
                })
                .whereNull('deleted_at')
                .whereIn('psp.id_product', inStockProducts)
                .pluck('psp.id_product');

            if (productSpecificPrices.length > 0) {
                inStockDiscountedProductIds = productSpecificPrices;
            }    

            inStockNonDiscountedProductIds = inStockProducts.filter(id => !inStockDiscountedProductIds.includes(id));

        }   

        // fetch the Out Of Stock products has discounts and group them into discounted/Non-discounted.

        let outOfStockDiscountedProductIds = [];
        let outOfStockNonDiscountedProductIds = [];

        if (filteredOutOfStockIds.length > 0) {

            let now = moment();
            let formatted = now.format('YYYY-MM-DD HH:mm:ss');

            let productSpecificPrices2 = await link
                .from('product_specific_price as psp')
                .where(function (q) {
                    q.where(function (q) {
                        q.where('psp.date_from', '<=', formatted).where('psp.date_to', '>=', formatted)
                            .where( 'reduction', '>', 0).where({ 'active': true, 'id_cart': default_uuid})
                    }).orWhereNull('psp.date_from','psp.date_to')
                })
                .whereNull('deleted_at')
                .whereIn('psp.id_product', filteredOutOfStockIds)
                .pluck('psp.id_product');

            if (productSpecificPrices2.length > 0) {
                outOfStockDiscountedProductIds = productSpecificPrices2;
            }    

            outOfStockNonDiscountedProductIds = filteredOutOfStockIds.filter(id => !outOfStockDiscountedProductIds.includes(id));

        }   

        const finalProductIds = [...inStockDiscountedProductIds, ...inStockNonDiscountedProductIds, 
            ...outOfStockDiscountedProductIds, ...outOfStockNonDiscountedProductIds];

        return finalProductIds;    
    }

    return model;
}