module.exports = (function ProductsDataDecorator() {
  const decorateProductsData = (products) => {
    const decoratedProductsForDb = products?.map((_product) => ({
      id: _product._id,
      name: _product.name,
      description: _product.description,
      account: _product.account,
      delivery_tax: _product.deliveryTax,
      eat_in_tax: _product.eatInTax,
      image_url: _product.imageUrl,
      location: _product.location,
      max: _product.max,
      min: _product.min,
      multiply: _product.multiply,
      plu: _product.plu,
      pos_product_category_id: _product.posProductCategoryId,
      pos_product_id: _product.posProductId,
      price: _product.price,
      product_type: _product.productType,
      takeaway_tax: _product.takeawayTax,
      parent_id: _product.parentId,
      snoozed: _product.snoozed,
    }));

    return decoratedProductsForDb;
  };

  const decorateProductStatusData = (products, action) => {
    return products.map((_product) => ({
      product_id: _product.id,
      cofe_menu_item_id: _product.cofe_menu_item_id,
      display: action === 'unsnooze',
    }));
  };

  return {
    decorateProductsData,
    decorateProductStatusData,
  };
})();
