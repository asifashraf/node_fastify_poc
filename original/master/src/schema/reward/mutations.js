const {
  formatError,
  removeLocalizationField,
  addLocalizationField,
} = require('../../lib/util');

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
