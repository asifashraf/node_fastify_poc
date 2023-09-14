module.exports = {
  NestedGroup: {
    nestedGroup({ nestedGroupId }, args, context) {
      return context.group.getById(nestedGroupId);
    },
    group({ groupId }, args, context) {
      return context.group.getById(groupId);
    },
  },
};
