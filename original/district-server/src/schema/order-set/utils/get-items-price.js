const { sumBy, find } = require('lodash');

const { cloneObject } = require('../../../lib/util');

const getItemsPrice = context => async rawInput => {
  const input = cloneObject(rawInput);
  // take prices from cMenu
  const cMenu = await context.brandLocation.calculateMenu(
    input.brandLocationId
  );
  const cMenuItems = cMenu.sections.reduce(
    (accItems, currentSection) => accItems.concat(currentSection.items),
    []
  );

  input.items = await Promise.all(
    input.items.map(async item => {
      const _cMenuItem = find(cMenuItems, cmi => cmi.id === item.itemId);
      if (_cMenuItem) {
        const _cMenuItemOptions = _cMenuItem.optionSets.reduce(
          (accItems, currentOptionSet) =>
            accItems.concat(currentOptionSet.options),
          []
        );

        item.type = _cMenuItem.type;

        item.selectedOptions = await Promise.all(
          item.selectedOptions.map(async selectedOption => {
            const _cMenuItemOption = find(
              _cMenuItemOptions,
              cmio => cmio.id === selectedOption.optionId
            );
            selectedOption.price = _cMenuItemOption.price;
            return selectedOption;
          })
        );
        item.price = Number.parseFloat(
          sumBy(item.selectedOptions, o => {
            return Number.parseFloat(o.price);
          })
        );
      }

      return item;
    })
  );
  return input;
};

module.exports = getItemsPrice;
