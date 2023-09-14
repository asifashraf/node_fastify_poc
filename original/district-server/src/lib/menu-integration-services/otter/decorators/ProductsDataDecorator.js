module.exports = function ProductsDataDecorator() {
  const isSingle = (min, max) => min < 0 || max <= 0;

  const updatePreviousOptionSet = (pOptionSet, options) => {
    const optionIndex = options.findIndex((x) => x.name === pOptionSet.value);
    if (optionIndex === -1) {
      pOptionSet['deleted'] = true;
    } else {
      pOptionSet['price'] = options[optionIndex].price;
    }
    return pOptionSet;
  };

  const addNewOptions = (option, previousItemOptions) => {
    const optionIndex = previousItemOptions.findIndex((x) => x.value === option.name);
    return optionIndex === -1 ? { value: option.name, price: option.price, sortOrder: 1 } : null;
  };

  const createOptionSet = ({ modifier, id = null, wasDeleted = false, previousItemOptions = [] }) => {
    const { name, minimumSelections, maximumSelections, options } = modifier;

    const newAddedOptions = options.map((option) => addNewOptions(option, previousItemOptions));

    const menuItemOptions = [...newAddedOptions.filter((x) => x !== null)];

    const menuItemOptionSet = {
      label: name,
      single: isSingle(minimumSelections, maximumSelections),
      sortOrder: 1,
      options: menuItemOptions,
      min: minimumSelections,
      max: maximumSelections,
    };

    if (wasDeleted) menuItemOptionSet['deleted'] = true;
    if (id !== null) menuItemOptionSet['id'] = id;

    return menuItemOptionSet;
  };

  const createOptionSets = ({ modifiers }) => {
    return modifiers.map((modifier) => createOptionSet({ modifier }));
  };

  const createInitialOptionSets = (data) => {
    const optionSets = [
      { label: 'Price', single: true, sortOrder: 0, options: [{ value: 'Price', price: data.price.amount }] },
    ];
    const createdOptionSets = createOptionSets({ modifiers: data.modifierGroupIds });
    return createdOptionSets.length > 0 ? [...optionSets, ...createdOptionSets] : optionSets;
  };

  const decorateProductsData = (payload, categoryId) => {
    const { categories, items: products } = payload.metadata.payload.menuData;
    const { itemIds: productIds } = categories[categoryId];

    const optionSets = createInitialOptionSets(products);

    // const _products = Object.values(products);
    // console.log("Turbo > file: ProductsDataDecorator.js:60 > decorateProductsData > _products:", _products);
    const decoratedProductsForDb = productIds?.map((productId) => ({
      sectionId: categoryId,
      name: products[productId].name,
      photo: products[productId].imageUrl || 'https://www.fesports.com.au/files/img/stock_256x256.jpg',
      itemDescription: products[productId].description,
      sortOrder: 0,
      optionSets,
      status: 'ACTIVE',
    }));

    return decoratedProductsForDb;
  };

  return {
    decorateProductsData,
  };
};
