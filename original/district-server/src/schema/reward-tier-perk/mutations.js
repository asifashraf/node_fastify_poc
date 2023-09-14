const {
  formatError,
  removeLocalizationField,
  addLocalizationField,
} = require('../../lib/util');
const {
  rewardTierPerkType,
  rewardTierPerkApplyType,
  rewardTierPerkError
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
  const menuItemErr = [];
  rewardTierPerksInput = removeLocalizationField(rewardTierPerksInput, 'title');
  const menuItemsWithTitle = rewardTierPerksInput.map(row => (
    {
      ...(row.rewardTierPerkMenuId && { id: row.rewardTierPerkMenuId }),
      menuItemId: row?.menuItemId,
      title: row.title,
      type: row.type,
      value: row.value
    }
  ));
  const isMenuItemAvailable = menuItemsWithTitle.every(item => item.menuItemId);
  if (isMenuItemAvailable) {
    await Promise.all(menuItemsWithTitle.map(async (row) => {
      const fetchMenuItem = await context.menuItem.getById(row.menuItemId);
      if (!fetchMenuItem) {
        menuItemErr.push(rewardTierPerkError.INVALID_MENU_ITEM);
      } else {
        if (fetchMenuItem.status == 'INACTIVE') {
          menuItemErr.push(rewardTierPerkError.INACTIVE_MENU_ITEM);
        }
      }
    }));
  }
  rewardTierPerksInput.map(function (item) {
    delete item?.menuItemId;
    delete item?.rewardTierPerkMenuId;
    return item;
  });
  if (menuItemErr.length > 0) {
    return formatError(menuItemErr, rewardTierPerksInput);
  }

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

  let rsp = await context.rewardTierPerk.getTierPerksWithMenuItems(perkIds);
  const perksMenuItems = [];
  if (isMenuItemAvailable) {
    for await (const row of rsp) {
      const result = menuItemsWithTitle.find(x => (x.title == row.title && x.type == row.type && x.value == row.value));
      if (result) {
        perksMenuItems.push({
          ...(result.id && { id: result.id }),
          rewardTierPerkId: row.id,
          menuItemId: result?.menuItemId
        });
      } else {
        perksMenuItems.push({
          rewardTierPerkId: row.id,
          menuItemId: result?.menuItemId
        });
      }
    }
    await context.rewardTierPerkMenuItem.save(perksMenuItems);

  }
  rsp = await context.rewardTierPerk.getTierPerksWithMenuItems(perkIds);
  rsp = addLocalizationField(rsp, 'title');
  return {
    rewardTierPerks: rsp,
  };
};

module.exports = {
  rewardTierPerkSave,
  rewardTierPerksSave,
};
