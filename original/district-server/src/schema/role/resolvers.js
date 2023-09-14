module.exports = {
  Role: {
    async permissions({ id }, args, context) {
      return context.rolePermission.getByRoleId(id);
    },
  },
};
