const { map, find, uniq, clone, findIndex } = require('lodash');
const { uuid } = require('../../lib/util');
const { subscriptionTypeBadgeMaps, priceTypes } = require('../c-subscription/enum');

module.exports = {
  CMenu: {
    async sections(root, args, context) {
      const customerId = context.auth.id;
      const sections = root.sections;
      if (customerId) {
        const subscriptionCustomers = await context.cSubscriptionCustomer.getAllActiveSubscriptionsByBrandId(customerId, root.brandId);
        if (subscriptionCustomers.length > 0) {
          const subscriptionIds = subscriptionCustomers.map(subscriptionCustomer => subscriptionCustomer.subscriptionId);
          let menuItemsWithSubId = uniq(await context.roDb('subscription_menu_items')
            .select(context.db.raw('menu_item_id, subscription_id, false as is_redeemed, id as subscription_menu_item_id'))
            .whereIn('subscription_id', subscriptionIds)
            .andWhere('brand_id', root.brandId));
          const subscribableOptionList = await context.roDb('subscription_menu_item_options')
            .select(context.db.raw('menu_item_option_id, subscription_id, subscription_menu_item_id'))
            .whereIn('subscription_id', subscriptionIds)
            .whereIn('subscription_menu_item_id', menuItemsWithSubId.map(menuItemWithSubId => menuItemWithSubId.subscriptionMenuItemId));
          const subsCusListPromises = subscriptionCustomers.map(subsCus => context.cSubscriptionCustomerTransaction.getTodayRedemptionSummaryInfo({ subscriptionCustomer: subsCus }));
          const [
            todayRedemptionSummaryInfoList,
            subscriptionList,
            subscriptionTypeBadges,
            subscriptionTypeBadgesForMenu,
          ] = await Promise.all([
            Promise.all(subsCusListPromises),
            Promise.all(subscriptionIds.map(t => context.cSubscription.getById(t))),
            context.cSubscription.subscriptionTypes(subscriptionTypeBadgeMaps.map(t => t.type), 'general'),
            context.cSubscription.subscriptionTypes(subscriptionTypeBadgeMaps.map(t => t.type), 'menu_item'),
          ]);
          await Promise.all(
            map(subscriptionCustomers, async subscriptionCustomer => {
              const { subscriptionType } = subscriptionList.find(t => t.id === subscriptionCustomer.subscriptionId);
              const { isRedeemedToday } = todayRedemptionSummaryInfoList.find(t => t.subscriptionCustomerId === subscriptionCustomer.id);
              menuItemsWithSubId = await Promise.all(map(menuItemsWithSubId, async menuItem => {
                if (subscriptionCustomer.subscriptionId === menuItem.subscriptionId) {
                  menuItem.isRedeemed = isRedeemedToday;
                  menuItem.subscriptionId = subscriptionCustomer.subscriptionId;
                  menuItem.subscriptionType = subscriptionType;
                }
                return menuItem;
              })
              );
            })
          );

          const subsSectionsItems = [];
          await Promise.all(root.sections.map(section => {
            return section.items.map(item => {
              const menuItem = find(menuItemsWithSubId, menuItem => item.id === menuItem.menuItemId);
              if (menuItem) {
                item.perDayCupsCount = menuItem.perDayCupsCount;
                item.remainingCupsCount = menuItem.remainingCupsCount;
                item.subscriptionType = menuItem.subscriptionType;
                if (!menuItem.isRedeemed) {
                  const badges = (subscriptionTypeBadges ?? []).find(t => t.name === menuItem.subscriptionType);
                  item.optionSets = item.optionSets.map(optionSet => {
                    optionSet.options = optionSet.options.map(option => {
                      option.subscribable = findIndex(subscribableOptionList, subscribableOption => subscribableOption.menuItemOptionId === option.id) > -1;
                      option.subscribableBadgeUrl = {
                        en: badges?.iconPath ?? '',
                        ar: badges?.iconPathAr,
                        tr: badges?.iconPathTr,
                      };
                      return option;
                    });
                    return optionSet;
                  });
                  item.subscribable = true;
                  item.subscriptionId = menuItem.subscriptionId;
                  item.subscriptionType = menuItem.subscriptionType;
                  const badgesForMenu = (subscriptionTypeBadgesForMenu ?? []).find(t => t.name === menuItem.subscriptionType);
                  item.subscribableBadgeUrl = {
                    en: badgesForMenu?.iconPath ?? '',
                    ar: badgesForMenu?.iconPathAr,
                    tr: badgesForMenu?.iconPathTr,
                  };
                  item.isRedeemed = false;
                }
                const subItem = clone(item);
                subItem.subscribable = true;
                const badgesForMenu = (subscriptionTypeBadgesForMenu ?? []).find(t => t.name === menuItem.subscriptionType);
                subItem.subscribableBadgeUrl = {
                  en: badgesForMenu?.iconPath ?? '',
                  ar: badgesForMenu?.iconPathAr,
                  tr: badgesForMenu?.iconPathTr,
                };
                subItem.isRedeemed = menuItem.isRedeemed;
                subItem.subscriptionId = menuItem.subscriptionId;
                subItem.redeemedLabel = {
                  en: 'Subscription redeemed for today',
                  ar: 'تم استخدام جميع أكواب الاشتراك لليوم',
                  tr: 'Bugünlük abonelikler kullanıldı',
                };
                subsSectionsItems.push(subItem);
              }
              return item;
            });
          })
          );
          const subSection = {
            id: uuid.get(),
            name: {
              en: 'Subscription',
              ar: 'الاشتراك',
              tr: 'Abonelik'
            },
            items: subsSectionsItems,
            sortOrder: 0
          };
          sections.unshift(subSection);
        }
      }
      return sections;
    }
  },
  CMenuItem: {
    async subscribable({ subscribable }, args, context) {
      if (subscribable) return subscribable;
      return false;
    },
    async displayablePrice(data, args, context) {
      if (data.subscribable) return 0;
      return data?.optionSets[0]?.options[0]?.price || 0;
    },
    async priceInfo(data, args, context) {
      const option = data?.optionSets?.find(t => t.sortOrder === 1)?.options.find(t => t.sortOrder === 1)
        || (data && data.optionSets && data.optionSets.length > 0 && data.optionSets[0]
        && data.optionSets[0].options && data.optionSets[0].options.length > 0 && data?.optionSets[0].options[0]
          ? data?.optionSets[0].options[0]
          : null);
      const priceValue = option?.price || 0;
      let compareAtPriceValue = option?.compareAtPrice || null;
      let displayablePriceValue = priceValue;
      let priceTypeValue = priceTypes.ORIGINAL;

      if (compareAtPriceValue) {
        priceTypeValue = priceTypes.DISCOUNTED;
      }

      if (data?.subscribable) {
        displayablePriceValue = 0;
        compareAtPriceValue = null;
        priceTypeValue = priceTypes.SUBSCRIPTION_DISCOUNTED;
      }
      return {
        price: priceValue,
        compareAtPrice: compareAtPriceValue,
        displayablePrice: displayablePriceValue,
        priceType: priceTypeValue,
      };
    },
  },

  CMenuItemOption: {
    async subscribable({id, subscribable}, args, context) {
      if (subscribable) return subscribable;
      return false;
      /* const { id, menuItemOptionSetId, subs } = data;
      const customerId = context.auth.id;
      if (customerId) {
        const menuItemOptionSet = await context.menuItemOptionSet.getById(menuItemOptionSetId);
        const menuItem = await context.menuItem.getById(menuItemOptionSet.menuItemId);
        const menu = await context.roDb('menu_sections')
          .join('menus', 'menus.id', 'menu_sections.menu_id')
          .where('menu_sections.id', menuItem.sectionId)
          .first();
        if (menu) {
          const activeSubs = await context.cSubscriptionCustomer.getAllActiveSubscriptionsByBrandId(customerId, menu.brandId);
          if (activeSubs && activeSubs.length > 0) {
            for (const subs of activeSubs) {
              const query = await context.roDb('subscription_menu_item_options')
                .where('subscription_id', subs.subscriptionId)
                .andWhere('menu_item_option_id', id);
              if (query && query.length > 0) {
                return true;
              }
            }
          }
          // const subscriptionId = await context.cSubscriptionCustomer.getLastActiveSubscriptionId(customerId, menu.countryId);
          // if (!subscriptionId) {
          //   return false;
          // }
          // const query = await context.roDb('subscription_menu_item_options')
          //   .where('subscription_id', subscriptionId)
          //   .andWhere('menu_item_option_id', id);
          // if (query && query.length > 0) return true;
          // return false;
        }
        return false;
      } */
    },
    async subscribableBadgeUrl({ subscribable, subscribableBadgeUrl }, args, context) {
      if (subscribable) {
        return subscribableBadgeUrl;
      }
      return null;
    },
  },
};
