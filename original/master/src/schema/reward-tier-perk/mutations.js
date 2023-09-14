const {
  formatError,
  removeLocalizationField,
  addLocalizationField,
} = require('../../lib/util');
const {
  rewardTierPerkType,
  rewardTierPerkApplyType,
} = require('../root/enums');

const rewardTierPerkSave = async (root, { rewardTierPerkInput }, context) => {
  const errors = await context.rewardTierPerk.validateRewardTierPerkInput(
    rewardTierPerkInput
  );
  if (errors.length > 0) {
    return formatError(errors, rewardTierPerkInput);
  }

  switch (rewardTierPerkInput.type) {
    case rewardTierPerkType.DISCOUNT:
      rewardTierPerkInput.applyType = rewardTierPerkApplyType.ONGOING;
      break;
    case rewardTierPerkType.ADD_POINTS:
      rewardTierPerkInput.applyType = rewardTierPerkApplyType.SPECIAL;
      break;
    default:
      rewardTierPerkInput.applyType = rewardTierPerkApplyType.CHOOSE;
  }
  const rewardTierPerkId = await context.rewardTierPerk.save(
    rewardTierPerkInput
  );
  return { rewardTierPerk: context.rewardTierPerk.getById(rewardTierPerkId) };
};

const rewardTierPerksSave = async (root, { rewardTierPerksInput }, context) => {
  rewardTierPerksInput = removeLocalizationField(rewardTierPerksInput, 'title');
  const errors = await context.rewardTierPerk.validateRewardTierPerksInput(
    rewardTierPerksInput
  );
  if (errors.length > 0) {
    return formatError(errors, rewardTierPerksInput);
  }
  let sortOrder = 1;
  rewardTierPerksInput = rewardTierPerksInput.map(rewardTierPerkInput => {
    rewardTierPerkInput.sortOrder = sortOrder++;
    switch (rewardTierPerkInput.type) {
      case rewardTierPerkType.DISCOUNT:
        rewardTierPerkInput.applyType = rewardTierPerkApplyType.ONGOING;
        break;
      case rewardTierPerkType.ADD_POINTS:
        rewardTierPerkInput.applyType = rewardTierPerkApplyType.SPECIAL;
        break;
      default:
        rewardTierPerkInput.applyType = rewardTierPerkApplyType.CHOOSE;
    }
    return rewardTierPerkInput;
  });
  const perkIds = await context.withTransaction(
    'rewardTierPerk',
    'save',
    rewardTierPerksInput
  );

  let rsp = await context.rewardTierPerk.getById(perkIds);
  rsp = addLocalizationField(rsp, 'title');
  return {
    rewardTierPerks: rsp,
  };
};

module.exports = {
  rewardTierPerkSave,
  rewardTierPerksSave,
};
