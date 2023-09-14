const { map } = require('bluebird');
const DataLoader = require('dataloader');

function createLoaders(model) {
  return {
    byMenuOptionSet: new DataLoader(async menuItemOptionSetIds => {
      const menuItemOptions = await model
        .db('menu_item_options')
        .whereIn('menu_item_option_set_id', menuItemOptionSetIds)
        .orderBy('sort_order', 'ASC');
      return map(menuItemOptionSetIds, menuItemOptionSetId =>
        menuItemOptions.filter(
          item => item.menuItemOptionSetId === menuItemOptionSetId
        )
      );
    }),
  };
}

module.exports = { createLoaders };
