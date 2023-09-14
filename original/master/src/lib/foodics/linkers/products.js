module.exports = function () {

  const isSingle = (min, max) => {
    if (min >= 0 && max > 0) return false;
    return true;
  };

  const createUpdatedOptionSets = ({ data, modifiers, previousOptionSets }) => {
    const _previousOptionSets = previousOptionSets.map(optionSet => {
      if (optionSet.label === 'Price') {
        optionSet.options[0].price = data.price;
      }

      if (optionSet.label !== 'Price') {
        const modifierIndex = modifiers.findIndex(x => x.name === optionSet.label);

        if (modifierIndex === -1) {
          if (optionSet.id) {
            optionSet['deleted'] = true;
          }
        } else {
          const modifier = modifiers[modifierIndex];
          optionSet = createOptionSet({ sortOrder: optionSet.sortOrder, id: optionSet.id, modifier, previousItemOptions: optionSet.options });
        }
      }

      return optionSet;
    });

    let newAddedModifiers = modifiers.map(modifier => {
      const { name } = modifier;
      const optionSetIndex = previousOptionSets.findIndex(x => x.label === name);
      if (optionSetIndex === -1) {
        return createOptionSet({ modifier });
      } else return null;
    });

    newAddedModifiers = newAddedModifiers.filter(x => x !== null);

    return [..._previousOptionSets, ...newAddedModifiers];
  };

  const createOptionSet = ({ modifier, id = null, wasDeleted = false, previousItemOptions = [], sortOrder = 1 }) => {
    const {
      name,
      minimum_options,
      maximum_options,
      options,
      excluded_options_ids,
    } = modifier;

    let menuItemOptions = [];

    if (previousItemOptions.length > 0) {
      const updatedPreviousOptions = previousItemOptions.map(pOptionSet => {
        const optionIndex = options.findIndex(x => x.name === pOptionSet.value);

        if (optionIndex === -1) {
          pOptionSet['deleted'] = true;
        } else {
          pOptionSet['price'] = options[optionIndex].price;
        }

        return pOptionSet;
      });

      let newAddedOptions = options.map(option => {
        const optionIndex = previousItemOptions.findIndex(x => x.value === option.name);

        if (optionIndex === -1) {
          return {
            value: option.name,
            price: option.price,
            sortOrder: 1,
          };
        } else return null;
      });

      newAddedOptions = newAddedOptions.filter(x => x !== null);

      menuItemOptions = [...updatedPreviousOptions, ...newAddedOptions];
    } else {
      let _menuItemOptions = options.map(option => {
        const { modifier_option_id } = option;

        const isExcluded = excluded_options_ids.includes(modifier_option_id);

        if (!isExcluded) {
          return {
            value: option.name,
            price: option.price,
            sortOrder: 1,
          };
        } else return null;
      });

      _menuItemOptions = _menuItemOptions.filter(x => x !== null);

      menuItemOptions = [...menuItemOptions, ..._menuItemOptions];
    }

    const menuItemOptionSet = {
      label: name,
      single: isSingle(minimum_options, maximum_options),
      sortOrder,
      options: menuItemOptions,
      min: minimum_options,
      max: maximum_options
    };

    if (wasDeleted) menuItemOptionSet['deleted'] = true;
    if (id !== null) menuItemOptionSet['id'] = id;

    return menuItemOptionSet;
  };

  const createOptionSets = ({ modifiers }) => {
    return modifiers.map((modifier) => {
      return createOptionSet({ modifier });
    });
  };

  const decorate = ({ data, previousOptionSets }) => {
    const { modifiers, cofe_menu_item_id } = data;
    const cofeMenuItemId = cofe_menu_item_id || null;
    let optionSets = [];

    if (cofeMenuItemId === null) {
      optionSets.push(
        {
          label: 'Price',
          single: true,
          sortOrder: 0,
          options: [{
            value: 'Price',
            price: data.price,
          }]
        }
      );

      const createdOptionSets = createOptionSets({ modifiers });

      if (createdOptionSets.length > 0) {
        optionSets = [...optionSets, ...createdOptionSets];
      }

    } else {
      optionSets = createUpdatedOptionSets({ data, modifiers, previousOptionSets });
    }

    const { image } = data;

    const productData = {
      sectionId: data.cofe_menu_section_id,
      name: data.name,
      photo: image || 'https://www.fesports.com.au/files/img/stock_256x256.jpg',
      itemDescription: data.description,
      sortOrder: 0,
      optionSets,
      status: 'ACTIVE',
    };

    if (cofeMenuItemId != null) productData['id'] = cofeMenuItemId;

    return productData;
  };

  return {
    async update({ data, qContext, dbContext }) {
      const { is_active, cofe_menu_item_id, brandId, branches } = data;

      if (cofe_menu_item_id === null) {
        delete data.cofe_menu_item_id;

        return await this.link({ data, dbContext, qContext });
      }

      let itemAvailability = [];

      if (!is_active) {

        await dbContext.setMenuItemStasusForBrand('INACTIVE', brandId, cofe_menu_item_id);

        return { message: null, done: true };
      }

      if (is_active) {
        if (branches.length > 0) {
          itemAvailability = branches.map(async branch => {
            const { cofe_brand_location_id, is_in_stock, is_active } = branch;
            if (cofe_brand_location_id !== null) {
              if (!is_in_stock || !is_active) {
                return await dbContext.setAvailabilityWithoutAuth(cofe_menu_item_id, cofe_brand_location_id, false, 'NOT_COMMERCIALIZED');
              } else {
                return await dbContext.setAvailabilityWithoutAuth(cofe_menu_item_id, cofe_brand_location_id, true);
              }
            }
          });
        }

        await Promise.all(itemAvailability);
      }

      let previousOptionSets = await qContext.menuItemOptionSet.getByMenuItemWithoutLoader(cofe_menu_item_id);

      previousOptionSets = previousOptionSets.map(async optionSet => {
        const setOptions = await qContext.menuItemOption.getByMenuOptionSetWithoutLoader(optionSet.id);

        optionSet['options'] = setOptions;

        return optionSet;
      });

      previousOptionSets = await Promise.all(previousOptionSets);

      const decoratedData = decorate({ data, previousOptionSets });

      const validate = await dbContext.validate([decoratedData], qContext, {}, true);

      const { errors } = validate;

      if (errors && errors.length > 0) {
        console.error('Foodics-Product-Linker > Errors >', errors);
        throw new Error('Foodics-Product-Linker Decorator Validation Failed');
      }

      await qContext.withTransaction('menuItem', 'saveMenuItemV2', decoratedData);

      return { message: null, done: true };
    },
    async link({ data, dbContext, qContext }) {
      if (!data.is_active) return { message: null, done: false };

      const { branches } = data;

      const decoratedData = decorate({ data });
      const validate = await dbContext.validate([decoratedData], qContext, {}, true);
      const { errors } = validate;
      if (errors && errors.length > 0) {
        console.error('Foodics-Product-Linker > Errors >', errors);
        throw new Error('Foodics-Product-Linker Decorator Validation Failed');
      }
      const cofeMenuItemId = await qContext.withTransaction('menuItem', 'saveMenuItemV2', decoratedData);

      if (branches.length > 0) {
        const itemAvailability = branches.map(async branch => {
          const { cofe_brand_location_id, is_in_stock, is_active } = branch;
          if (cofe_brand_location_id !== null) {
            if (!is_in_stock || !is_active) {
              return await dbContext.setAvailabilityWithoutAuth(cofeMenuItemId, cofe_brand_location_id, false, 'NOT_COMMERCIALIZED');
            } else {
              return await dbContext.setAvailabilityWithoutAuth(cofeMenuItemId, cofe_brand_location_id, true);
            }
          }
        });

        await Promise.all(itemAvailability);
      }
      return {
        message: {
          cofe_menu_item_id: cofeMenuItemId,
          ...data,
          entity: 'product',
        },
        done: true
      };
    }
  };
}();
