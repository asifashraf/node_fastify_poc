const DataLoader = require('dataloader');
const { map, groupBy } = require('lodash');
const { addLocalizationField } = require('../../lib/util');

function createLoaders(model) {
  return {
    option: new DataLoader(async optionsIds => {
      const options = groupBy(
        addLocalizationField(
          await model
            .db('menu_item_options')
            .whereIn('menu_item_option_set_id', optionsIds)
            .orderBy('sort_order', 'ASC'),
          'value'
        ),
        'menuItemOptionSetId'
      );
      return map(optionsIds, menuItemsId =>
        (options[menuItemsId] ? options[menuItemsId] : [])
      );
    }),
    byMenuItem: new DataLoader(async menuItemIds => {
      const optionSets = await model
        .db('menu_item_option_sets')
        .whereIn('menu_item_id', menuItemIds)
        .orderBy('sort_order', 'ASC');
      return map(menuItemIds, menuItemId =>
        optionSets.filter(item => item.menuItemId === menuItemId)
      );
    }),
  };
}

module.exports = { createLoaders };
