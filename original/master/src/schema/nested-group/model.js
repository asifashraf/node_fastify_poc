const BaseModel = require('../../base-model');
const { createLoaders } = require('./loaders');

class NestedGroup extends BaseModel {
  constructor(db, context) {
    super(db, 'nested_groups', context);
    this.loaders = createLoaders(this);
  }

  getByGroupId(groupId) {
    return this.db(this.tableName)
      .select('groups.*')
      .join('groups', 'groups.id', 'nested_groups.nested_group_id')
      .where('group_id', groupId);
  }

  deleteNestedGroup(groupId, nestedGroupId) {
    return this.db(this.tableName)
      .where('group_id', groupId)
      .where('nested_group_id', nestedGroupId)
      .del();
  }

  getByGroupAnNestedGroupId(groupId, nestedGroupId) {
    return this.db(this.tableName)
      .where('group_id', groupId)
      .where('nested_group_id', nestedGroupId)
      .first();
  }

  async validate() {
    const errors = [];

    return errors;
  }
}

module.exports = NestedGroup;
