module.exports = {
  GroupAdmin: {
    group({ groupId }, args, context) {
      return context.group.getById(groupId);
    },
    admin({ adminId }, args, context) {
      return context.admin.getById(adminId);
    },
  },
};
