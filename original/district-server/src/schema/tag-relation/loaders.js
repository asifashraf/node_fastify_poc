const DataLoader = require('dataloader');
const { statusTypes } = require('../root/enums');
const { addLocalizationField } = require('../../lib/util');

function createLoaders(model) {
  return {
    getTagsByRelId: new DataLoader(async relIds => {
      const query = model.db(model.tableName)
        .select('tags.*', 'rel_id')
        .join('tags', 'tag_relations.tag_id', 'tags.id')
        .where('tags.status', statusTypes.ACTIVE)
        .whereIn('rel_id', relIds)
        .orderBy(`${model.tableName}.created`, 'desc');
      const tags = addLocalizationField(
        addLocalizationField(await query, 'name'),
        'description',
      );

      return relIds.map(relId => tags.filter(tag => tag.relId === relId));
    }),
  };
}

module.exports = { createLoaders };
