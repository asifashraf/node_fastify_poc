const {
  formatError,
  removeLocalizationField,
  addLocalizationField,
  getAuthUser
} = require('../../lib/util');
const { kinesisAdminEventTypes } = require('../../lib/aws-kinesis-logging');

const rewardSave = async (root, { rewardInput }, context) => {
  rewardInput = removeLocalizationField(
    removeLocalizationField(rewardInput, 'title'),
    'conversionName'
  );
  const errors = await context.reward.validateRewardInput(rewardInput);
  if (errors.length > 0) {
    return formatError(errors, rewardInput);
  }
  const rewardId = await context.reward.save(rewardInput);
  const adminActivityLog = await getAuthUser(context);
  await context.kinesisLogger.sendLogEvent(
    {...adminActivityLog, rewardInput},
    kinesisAdminEventTypes.rewardSaveAdminEvent,
    'Admin'
  );
  const rw = await context.reward.getById(rewardId);
  return {
    reward: addLocalizationField(
      addLocalizationField(rw, 'title'),
      'conversionName'
    ),
  };
};

module.exports = {
  rewardSave,
};
