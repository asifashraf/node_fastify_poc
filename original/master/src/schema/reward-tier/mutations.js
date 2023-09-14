const { formatError, removeLocalizationField } = require('../../lib/util');

/*const rewardTierSave = async (root, { rewardTierInput }, context) => {
  const errors = await context.rewardTier.validateRewardTierInput(
    rewardTierInput
  );
  if (errors.length > 0) {
    return formatError(errors, rewardTierInput);
  }
  const rewardTierId = await context.rewardTier.save(rewardTierInput);
  return { rewardTier: context.rewardTier.getById(rewardTierId) };
};*/

const rewardTiersSave = async (root, { rewardTiersInput }, context) => {
  rewardTiersInput = removeLocalizationField(rewardTiersInput, 'title');
  const errors = await context.rewardTier.validateRewardTiersInput(
    rewardTiersInput
  );
  if (errors.length > 0) {
    return formatError(errors, rewardTiersInput);
  }
  let sortOrder = 1;
  rewardTiersInput = rewardTiersInput.map(rewardTierInput => {
    rewardTierInput.sortOrder = sortOrder++;
    return rewardTierInput;
  });
  const res = await context.withTransaction(
    'rewardTier',
    'save',
    rewardTiersInput
  );
  return {
    rewardTiers: context.rewardTier.getAllByRewardId(
      rewardTiersInput[0].rewardId
    ),
    errorDescription: res.errorDescription,
    error: res.errors.length > 0 ? res.errors[0] : null,
    errors: res.errors,
  };
};

module.exports = {
  //rewardTierSave,
  rewardTiersSave,
};
