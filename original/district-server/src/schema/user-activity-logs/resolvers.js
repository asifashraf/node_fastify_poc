module.exports = {
  UserActivityLog: {
    referenceUser({ referenceUserId }, args, context) {
      return context.admin.getById(referenceUserId);
    },
  },
};
