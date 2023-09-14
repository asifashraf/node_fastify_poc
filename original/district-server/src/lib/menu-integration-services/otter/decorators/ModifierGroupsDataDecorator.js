const { isEmpty } = require('lodash');

module.exports = function ModifierGroupsDataDecorator() {
  const decorateProductModifierGroups = ({
    modifierGroupsIds,
    modifierGroups,
    product_id,
  }) => {
    return modifierGroupsIds
      .map((id) => {
        const group = modifierGroups[id];

        if (!isEmpty(group)) {
          const { _id, name, description, min, max } = group;

          return {
            id: _id,
            label: name,
            description,
            min,
            max,
            product_id,
          };
        }
      })
      .filter(Boolean);
  };

  return {
    decorateProductModifierGroups,
  };
};
