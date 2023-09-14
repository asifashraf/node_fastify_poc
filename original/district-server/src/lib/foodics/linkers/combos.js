module.exports = function () {
  const decorate = ({ data, updateOptionSets }) => {
    const { modifiers, cofe_menu_item_id } = data;
    const _cofe_menu_item_id = cofe_menu_item_id || null;
    let optionSets = [];
    if (_cofe_menu_item_id === null) {
      const _optionSets = modifiers.map((modifier) => {
        const {
          name,
          options,
        } = modifier;
        const _options = options.map((option) => {
          return {
            value: option.name,
            price: option.price,
            sortOrder: 1,
          };
        });
        return {
          label: name,
          single: (options.length === 1),
          sortOrder: 1,
          options: _options,
        };
      });
      if (_optionSets.length > 0) {
        optionSets = [...optionSets, ..._optionSets];
      }
    } else {
      optionSets = updateOptionSets;
      //const indexOfPriceSet = optionSets.findIndex(x => x.label === 'Price');
      //optionSets[indexOfPriceSet].options[0].price = data.price;
      modifiers.map(modifier => {
        const { options } = modifier;
        const indexOfOptionSet = optionSets.findIndex(x => x.label === modifier.name);
        const _setOptions = optionSets[indexOfOptionSet].options;
        options.map(option => {
          const indexOfOption = _setOptions.findIndex(x => x.value === option.name);
          optionSets[indexOfOptionSet].options[indexOfOption].price = option.price;
        });
      });
    }
    const { image } = data;
    const _product = {
      sectionId: data.cofe_menu_section_id,
      name: data.name,
      photo: image || 'https://www.fesports.com.au/files/img/stock_256x256.jpg',
      itemDescription: data.description,
      sortOrder: 0,
      optionSets,
    };
    if (_cofe_menu_item_id != null) _product['id'] = _cofe_menu_item_id;
    return _product;
  };
  return {
    async update({ data, qContext, dbContext }) {
      const updateOptionSets = await qContext.menuItemOptionSet.getByMenuItem(data.cofe_menu_item_id);
      for (const optionSet of updateOptionSets) {
        const setOptions = await qContext.menuItemOption.getByMenuOptionSet(optionSet.id);
        optionSet['options'] = setOptions;
      }
      const decoratedData = decorate({ data, updateOptionSets });
      const validate = await dbContext.validate([decoratedData], qContext, {}, true);
      const { errors } = validate;
      if (errors && errors.length > 0) {
        console.error('Foodics-Combo-Linker > Errors >', errors);
        throw new Error('Foodics-Combo-Linker Decorator Validation Failed');
      }
      await dbContext.save([decoratedData]);
      return { message: null, done: true };
    },
    async link({ queue, data, dbContext, brand, menu, qContext }) {
      const decoratedData = decorate({ data, menu });
      const validate = await dbContext.validate([decoratedData], qContext, {}, true);
      const { errors } = validate;
      if (errors && errors.length > 0) {
        console.error('Foodics-Combo-Linker > Errors >', errors);
        throw new Error('Foodics-Combo-Linker Decorator Validation Failed');
      }
      const [_save] = await dbContext.save([decoratedData]);
      return {
        message: {
          cofe_menu_item_id: _save,
          ...data,
          entity: 'combo',
        },
        done: true
      };
    }
  };
}();
