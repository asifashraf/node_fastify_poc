module.exports = {
  RolePermission: {
    role({ roleId }, args, context) {
      return context.role.getById(roleId);
    },
    permission({ permissionId }, args, context) {
      return context.permission.getById(permissionId);
    },
  },
};
