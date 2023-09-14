const BaseModel = require('../../base-model');
const { createLoaders } = require('./loaders');
const { groupCreateError } = require('../root/enums');
const { pick, forEach } = require('lodash');

class Group extends BaseModel {
  constructor(db, context) {
    super(db, 'groups', context);
    this.loaders = createLoaders(this);
  }

  getByName(name) {
    return this.db(this.tableName)
      .where('name', name)
      .first();
  }

  async validate(groupInput) {
    const errors = [];

    const groupNameCheck = await this.getByField('name', groupInput.name);

    if (groupNameCheck && (!groupInput.id || groupNameCheck.id !== groupInput.id)) {
      errors.push(groupCreateError.DUPLICATE_NAME);
    }

    return errors;
  }

  async saveGroup(input) {
    const group = pick(input, ['name', 'description']);
    const nestedGroups = input.nestedGroups ? input.nestedGroups : [];
    const roles = input.roles ? input.roles : [];
    if (input.id) {
      group.id = input.id;
    }
    const promisesAddGroupDB = [];
    const promisesDelGroupDB = [];
    const promisesAddRoleDB = [];
    const promisesDelRoleDB = [];

    const groupId = await super.save(group);

    if (nestedGroups.length > 0) {
      forEach(nestedGroups, async n => {
        if (n.deleted === true) {
          promisesDelGroupDB.push(
            this.context.nestedGroup.deleteNestedGroup(groupId, n.groupId)
          );
        } else {
          const nestedGroup = await this.context.nestedGroup.getByGroupAnNestedGroupId(
            groupId,
            n.groupId
          );
          if (!nestedGroup) {
            promisesAddGroupDB.push(
              this.context.nestedGroup.save({
                groupId,
                nestedGroupId: n.groupId,
              })
            );
          }
        }
      });
    }
    if (roles.length > 0) {
      forEach(roles, async n => {
        if (n.deleted === true) {
          promisesDelRoleDB.push(
            this.context.groupRole.deleteGroupRole(groupId, n.roleId)
          );
        } else {
          const groupRole = await this.context.groupRole.getByGroupAndRoleId(
            groupId,
            n.roleId
          );
          if (!groupRole) {
            promisesAddRoleDB.push(
              this.context.groupRole.save({
                groupId,
                roleId: n.roleId,
              })
            );
          }
        }
      });
    }

    await Promise.all(promisesAddGroupDB);
    await Promise.all(promisesDelGroupDB);
    await Promise.all(promisesAddRoleDB);
    await Promise.all(promisesDelRoleDB);

    return groupId;
  }
}

module.exports = Group;
