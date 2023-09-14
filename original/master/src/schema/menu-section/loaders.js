const DataLoader = require('dataloader');
const { map, groupBy } = require('lodash');
const { addLocalizationField } = require('../../lib/util');

function createLoaders(model) {
  return {
    item: new DataLoader(async sectionsIds => {
      const items = groupBy(
        addLocalizationField(
          addLocalizationField(
            await model
              .db('menu_items')
              .whereIn('section_id', sectionsIds)
              .orderBy('sort_order', 'ASC'),
            'itemDescription'
          ),
          'name'
        ),
        'sectionId'
      );

      return map(sectionsIds, sectionId =>
        (items[sectionId] ? items[sectionId] : [])
      );
    }),
  };
}

module.exports = { createLoaders };
