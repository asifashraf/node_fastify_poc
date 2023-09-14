module.exports = {
  Group: {
    roles({ id }, args, context) {
      return context.groupRole.getByGroupId(id);
    },
    nestedGroups({ id }, args, context) {
      return context.nestedGroup.getByGroupId(id);
    },
    admins({ id }, args, context) {
      return context.admin.getByGroupId(id);
    },
  },
};
