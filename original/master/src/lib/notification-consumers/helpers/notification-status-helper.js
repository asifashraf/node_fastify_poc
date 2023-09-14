module.exports = {
  updateNotificationStatusDb: async function updateNotificationStatus(
    queryContext,
    targetTable,
    id,
    status
  ) {
    return queryContext.db
      .table(targetTable)
      .update({
        status: status,
      })
      .where('id', id);
  }
}
