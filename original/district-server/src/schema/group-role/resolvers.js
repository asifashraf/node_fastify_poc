module.exports = {
  GroupRole: {
    role({ roleId }, args, context) {
      return context.role.getById(roleId);
    },
    group({ groupId }, args, context) {
      return context.group.getById(groupId);
    },
  },
};
