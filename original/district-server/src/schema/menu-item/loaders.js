const DataLoader = require('dataloader');
const { map, groupBy } = require('lodash');
const { addLocalizationField } = require('../../lib/util');

function createLoaders(model) {
  return {
    optionSet: new DataLoader(async menuItemsIds => {
      const optionSets = groupBy(
        addLocalizationField(
          await model
            .db('menu_item_option_sets')
            .whereIn('menu_item_id', menuItemsIds)
            .orderBy('sort_order', 'ASC'),
          'label'
        ),
        'menuItemId'
      );
      return map(menuItemsIds, menuItemsId =>
        (optionSets[menuItemsId] ? optionSets[menuItemsId] : [])
      );
    }),
  };
}

module.exports = { createLoaders };
