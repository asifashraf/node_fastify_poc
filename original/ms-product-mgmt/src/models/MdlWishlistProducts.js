module.exports = function MdlWishlistProducts(opts) {

    const { baseModel, guid, mdlProducts, mdlCategoryProducts } = opts;

    const model = baseModel('products_wishlist');

    const { link } = model;

    model.getWishlistProducts = async function getWishlistProducts( pagination, i8ln ) {

        let products = { data: null };

        const { cofeCustomerToken } = i8ln

        const customer = await mdlCategoryProducts.autheticateCustomer(cofeCustomerToken);

        if (!customer.data)
            throw new Error(`invalid_customer`);

        const { id } = customer.data;

        let _productIds = await link.from('products_wishlist')
            .where('id_customer', id).pluck('id_product')

        if (_productIds?.length) {

            let filters = { id_product: _productIds, active: true };

            products = await mdlProducts.getAll(filters, pagination, i8ln)

            if (products.data.length === 0) {
                products = { data: null }
            }
        }

        return products;
    }

    model.addToWishlist = async function addToWishlist(id, i8ln) {

        const { cofeCustomerToken } = i8ln;

        const customer = await mdlCategoryProducts.autheticateCustomer(cofeCustomerToken);

        if (!customer.data)
            throw new Error(`invalid_customer`);

        const { id: customerId } = customer.data;

        const itExists  = await link('products').where( 'id', id ).first('id')

        if (!itExists) throw new Error(`invalid_product`)

        const alreadyWished  = await link('products_wishlist')
            .where( 'id_product', id ).where('id_customer', customerId).first('id')

        if (alreadyWished) throw new Error(`already_wished`)

        const [insertId] = await link('products_wishlist').insert({
            id: guid.v4(),
            id_product: id,
            id_customer: customerId,
        }, 'id_product');

        return { "data" : { ...insertId } };
    }

    model.removeFromWishlist = async function removeFromWishlist(id, i8ln) {

        const { cofeCustomerToken } = i8ln;

        const customer = await mdlCategoryProducts.autheticateCustomer(cofeCustomerToken);

        if (!customer.data)
            throw new Error(`invalid_customer`);

        const { id: customerId } = customer.data;

        const itExists  = await link('products').where( 'id', id ).first('id')

        if (!itExists) throw new Error(`invalid_product`)

        const alreadyWished  = await link('products_wishlist')
            .where( 'id_product', id ).where('id_customer', customerId).first('id')

        if (!alreadyWished) throw new Error(`not_in_wishlist`)

        await link('products_wishlist').del().where('id_product', id)
            .where('id_customer', customerId);

        return { "data" : { id_product: id } };
    }

    return model;
}
