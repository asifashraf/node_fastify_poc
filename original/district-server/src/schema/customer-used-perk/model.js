const {
  first,
  sortBy,
  flatMap,
  uniq,
  includes,
  pullAt,
  find,
  partition,
} = require('lodash');

const BaseModel = require('../../base-model');
const {
  rewardStatus,
  rewardTierPerkType,
  menuItemType,
} = require('../root/enums');
const { createLoaders } = require('./loaders');

class CustomerUsedPerk extends BaseModel {
  constructor(db, context) {
    super(db, 'customer_used_perks', context);
    this.loaders = createLoaders(this);
  }

  getByCustomerId(customerId) {
    return this.getAll()
      .where('customer_id', customerId)
      .orderBy('created', 'desc');
  }

  getByCustomerIdAndRewardId(customerId, rewardId) {
    return this.getAll()
      .where('customer_id', customerId)
      .andWhere('reward_id', rewardId)
      .orderBy('created', 'desc');
  }

  async getItemsForUsedPerk(usedPerk) {
    let items = null;
    if (
      !includes(
        [
          rewardTierPerkType.DISCOUNT,
          rewardTierPerkType.FREE_DELIVERY,
          rewardTierPerkType.ADD_POINTS,
        ],
        usedPerk.type
      )
    ) {
      let orderSetItems = await this.context.orderItem.getByOrderSetId(
        usedPerk.orderSetId
      );
      orderSetItems = sortBy(orderSetItems, ['price']);
      const menuItemIds = uniq(flatMap(orderSetItems, t => t.menuItemId));
      const menuItems = await this.context.menuItem.getByIds(menuItemIds);
      orderSetItems = orderSetItems.map(orderSetItem => {
        const matchedMenuItem = find(
          menuItems,
          t => t && t.id === orderSetItem.menuItemId
        );
        orderSetItem.type = matchedMenuItem
          ? matchedMenuItem.type
          : menuItemType.OTHERS;
        return orderSetItem;
      });

      items = [];
      let usedPerkTotal = parseFloat(usedPerk.total);
      let timesIterated = 0;
      const orderSetItemsCount = orderSetItems.length;
      const getItem = () => {
        let item = null;
        orderSetItems.map((orderSetItem, arrayIndex) => {
          if (!item) {
            switch (true) {
              case usedPerk.type === rewardTierPerkType.FREE_DRINK &&
                orderSetItem.type === menuItemType.DRINK:
                item = { ...orderSetItem, arrayIndex };
                break;
              case usedPerk.type === rewardTierPerkType.FREE_FOOD &&
                orderSetItem.type === menuItemType.FOOD:
                item = { ...orderSetItem, arrayIndex };
                break;
              default:
                item = null;
            }
          }
          return orderSetItem;
        });
        if (item) {
          const itemQuantity = parseFloat(item.quantity);
          if (itemQuantity >= usedPerkTotal) {
            item.quantity = usedPerkTotal;
            usedPerkTotal = 0;
          } else {
            usedPerkTotal -= itemQuantity;
            pullAt(orderSetItems, item.arrayIndex);
          }
          items.push(item);
        }
        timesIterated++;
        if (usedPerkTotal > 0 && timesIterated <= orderSetItemsCount) {
          getItem();
        }
      };
      getItem();
    }
    return items;
  }

  async getByOrderSetId(orderSetId) {
    return this.getAll()
      .select('*')
      .where('order_set_id', orderSetId);
  }

  async addPerks(orderSetId, rawPerks, usedPerksStatus) {
    const orderSet = await this.context.orderSet.getById(orderSetId);
    const brandLocation = await this.context.brandLocation.getById(
      orderSet.brandLocationId
    );
    const brand = await this.context.brand.getById(brandLocation.brandId);
    const reward = first(
      await this.context.reward
        .getByBrandId(brand.id)
        .where('status', rewardStatus.ACTIVE)
    );
    const perks = [];
    const perkQuantities = {};
    const perksOps = [];
    rawPerks.map(rPerk => {
      perkQuantities[rPerk.type] = perkQuantities[rPerk.type]
        ? perkQuantities[rPerk.type] + rPerk.quantity
        : rPerk.quantity;
      return rPerk;
    });
    Object.keys(perkQuantities).map(type => {
      perks.push({
        customerId: orderSet.customerId,
        orderSetId,
        type,
        rewardId: reward.id,
        total: perkQuantities[type],
        status: usedPerksStatus,
      });
      if (
        [rewardTierPerkType.DISCOUNT, rewardTierPerkType.ADD_POINTS].includes(
          type
        ) === false &&
        usedPerksStatus === 1
      ) {
        perksOps.push(
          this.context.customerPerk.increment(
            orderSet.customerId,
            reward.id,
            type,
            perkQuantities[type] * -1
          )
        );
      }
      return type;
    });
    if (perksOps.length > 0) {
      await Promise.all(perksOps);
    }
    return super.save(perks);
  }

  async changeUsedPerksStatus(orderSetId, status = 0) {
    const usedPerks = await this.getAll()
      .select('*')
      .where('order_set_id', orderSetId);
    if (usedPerks.length > 0) {
      const perksOps = [];
      const [ongoingAndSpecial, choose] = partition(usedPerks, t =>
        [rewardTierPerkType.DISCOUNT, rewardTierPerkType.ADD_POINTS].includes(
          t.type
        )
      );
      ongoingAndSpecial.map(ongoingOrSpecialPerk => {
        perksOps.push(this.save({ ...ongoingOrSpecialPerk, status }));
        return ongoingOrSpecialPerk;
      });
      choose.map(choosePerk => {
        // if status = used then subtract else add => for incrementing or decrementing customer perks
        const quantityChange = status === 1 ? -1 : 1;
        if (status !== choosePerk.status) {
          // increment or decrement perks only if status changed
          perksOps.push(
            this.context.customerPerk.increment(
              choosePerk.customerId,
              choosePerk.rewardId,
              choosePerk.type,
              parseFloat(choosePerk.total) * quantityChange
            )
          );
          perksOps.push(this.save({ ...choosePerk, status }));
        }
        return choosePerk;
      });
      await Promise.all(perksOps);
      return true;
    }
    return false;
  }
}

module.exports = CustomerUsedPerk;
