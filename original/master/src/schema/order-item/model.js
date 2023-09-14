const {
  map,
  omit,
  isArray,
  flatten,
  first,
  find,
  includes,
  // startsWith,
  // get,
} = require('lodash');
const { omit: omitFp } = require('lodash/fp');
const BaseModel = require('../../base-model');
const Promise = require('bluebird');
const { createLoaders } = require('./loaders');
const { addLocalizationField } = require('../../lib/util');
const {
  paymentStatusName,
  orderItemsRefundError,
  paymentStatusOrderType,
  transactionType,
  transactionAction,
  loyaltyTransactionType,
  orderItemsAvailability
  // orderPaymentMethods,
} = require('../root/enums');

class OrderItem extends BaseModel {
  constructor(db, context) {
    super(db, 'order_items', context);
    this.loaders = createLoaders(this);
  }

  async getByOrderSetId(orderSetId) {
    return addLocalizationField(
      await this.loaders.byOrderSet.load(orderSetId),
      'name'
    );
  }

  rewardPerkFreeAmount(orderSetId) {
    const query = this.db(this.tableName)
      .select(
        this.db.raw(
          `
          sum(price*free_quantity) as freeFoodDrink
          `
        )
      )
      .where('order_set_id', orderSetId)
      .first();
    return query;
  }

  async orderItemsRefund(orderSetId, orderItems, orderType) {
    const {
      customerId,
      fee,
      // paymentMethod,
      brandLocationId,
      currencyId,
    } = await this.context.orderSet.getById(orderSetId);
    const orderItemPromises = [];
    const discoveryPromises = [];
    let totalRefunded = 0;
    const brandLocation = await this.context.brandLocation.getById(
      brandLocationId
    );
    const calculateItemPrice = (p, q) => {
      return parseFloat(p) * parseFloat(q);
    };

    const mapData = data => {
      data = data || [];
      return data.reduce(function (acc, x) {
        const id = acc[x.giftCardId];
        if (id) {
          id.debit += Number(x.debit);
          id.credit += Number(x.credit);
        } else {
          acc[x.giftCardId] = x;
        }
        return acc;
      }, {});
    };

    // initialize loyalty transaction data
    const lTData = {
      referenceOrderId: orderSetId,
      orderType,
      credit: 0.0,
      customerId,
      currencyId,
    };
    let newCredits = 0.0;
    let tempCredits = 0.0;

    // find all order items
    const orderItemsDB = await this.context.orderItem.getByOrderSetId(
      orderSetId
    );
    // calculate already refunded credits
    if (orderItems.length > 0) {
      let item;
      orderItems.forEach(orderItem => {
        item = find(orderItemsDB, o => {
          return o.id === orderItem.id;
        });
        // remaining quantity
        const remainingQuantity =
          parseFloat(item.quantity) - parseFloat(item.refundedQuantity);
        // if quantity is valid and item is not already refunded.
        if (parseFloat(orderItem.quantity) <= remainingQuantity) {
          let quantitytoBePaidActual = parseFloat(orderItem.quantity);
          // if (parseFloat(item.quantity) - parseFloat(item.freeQuantity) === 0) {
          //   quantitytoBePaidActual = 0;
          // } else {
          if (parseFloat(item.freeQuantity) === 0) {
            quantitytoBePaidActual = parseFloat(orderItem.quantity);
          } else if (
            parseFloat(item.freeQuantity) >= parseFloat(orderItem.quantity)
          ) {
            if (
              parseFloat(orderItem.quantity) <=
              parseFloat(item.refundedQuantity)
            ) {
              let r1 =
                parseFloat(item.refundedQuantity) -
                parseFloat(item.freeQuantity);
              if (r1 < 0) r1 *= -1;
              quantitytoBePaidActual = parseFloat(orderItem.quantity) - r1;
            } else {
              quantitytoBePaidActual = 0;
            }

            if (quantitytoBePaidActual < 0) {
              quantitytoBePaidActual *= -1;
            }
          } else {
            let r2 =
              parseFloat(item.refundedQuantity) - parseFloat(item.freeQuantity);
            if (r2 < 0) r2 *= -1;
            quantitytoBePaidActual =
              parseFloat(orderItem.quantity) - parseFloat(item.freeQuantity);
          }
          // }
          if (quantitytoBePaidActual < 0) {
            quantitytoBePaidActual *= -1;
          }
          tempCredits = calculateItemPrice(
            (parseFloat(item.price) - parseFloat(item.couponPerQuantity)) *
              parseFloat(item.perkDiscountMultiplier),
            quantitytoBePaidActual
          );
          newCredits += tempCredits;
          lTData.credit += tempCredits;
          const refunded = parseFloat(orderItem.quantity) === remainingQuantity;
          orderItemPromises.push(
            this.context.orderItem.save({
              id: item.id,
              refunded,
              refundedQuantity:
                parseFloat(item.refundedQuantity) +
                parseFloat(orderItem.quantity),
            })
          );
          if (parseFloat(orderItem.quantity) === remainingQuantity)
            totalRefunded++;
        }
      });
    }
    if (totalRefunded === orderItemsDB.length) {
      lTData.credit += parseFloat(fee);
      orderItemPromises.push(
        this.context.orderSet.save({ id: orderSetId, refunded: true })
      );
      newCredits += parseFloat(fee);
    }
    // console.log('lTData', lTData);

    // if paid via gift card
    const giftCards = mapData(
      map(
        await this.context.giftCardTransaction.getByOrderId(orderSetId),
        tr => {
          return {
            debit: Number(tr.debit),
            credit: Number(tr.credit),
            giftCardId: tr.giftCardId,
          };
        }
      )
    );
    // console.log('giftCards', giftCards);

    // @TODO - this is to refund only one gift card
    // in future we might need to use two gift cards at one time
    // so this should br handled for any number of used gift cards

    const giftCardIds = Object.keys(giftCards);

    if (giftCardIds.length > 0) {
      const giftCardId = giftCardIds[0];
      const debit = Number(giftCards[giftCardId].debit) || 0;
      const credit = Number(giftCards[giftCardId].credit) || 0;
      // console.log('credit', credit); // 7.5
      // console.log('debit', debit); // 9 = 9 - 7.5 = 1.5
      // console.log('lTData.credit', lTData.credit); // 2.5
      if (debit > 0 && !isNaN(debit)) {
        let giftCardRefundAmount = 0.0;
        if (credit < debit) {
          lTData.giftCardId = giftCardId;

          if (Number(lTData.credit) <= debit - credit) {
            giftCardRefundAmount = Number(lTData.credit);
            lTData.credit = 0.0;
          } else {
            // divide the credits we want to refund partially in gift card and
            // rest of credits will go to cofe credits

            // this is for gift card
            giftCardRefundAmount = debit - credit;

            // this is for cofe credits
            lTData.credit = Number(lTData) - (debit - credit);
          }
          lTData.amount = giftCardRefundAmount;

          orderItemPromises.push(
            this.context.giftCardTransaction.credit(lTData)
          );
        }
      }
    }
    let discoveryCreditGenerate = 0;
    let discoveryCreditRedemptionId = null;
    if (Number(lTData.credit) > 0) {
      const discoveryCredit = await this.context.discoveryCredit.getByCustomerAndCurrencyId(
        customerId,
        currencyId
      );
      if (discoveryCredit) {
        const discoveryCreditRedemption = await this.context.discoveryCreditRedemption.usedByBrandAndOrder(
          discoveryCredit.id,
          brandLocation.brandId,
          orderSetId,
          false
        );
        if (
          discoveryCreditRedemption &&
          Number(lTData.credit) >= Number(discoveryCreditRedemption.amount)
        ) {
          lTData.credit =
            Number(lTData.credit) - Number(discoveryCreditRedemption.amount);

          discoveryCreditGenerate = Number(discoveryCreditRedemption.amount);
          discoveryCreditRedemptionId = discoveryCreditRedemption.id;
        }
      }

      orderItemPromises.push(
        this.context.loyaltyTransaction.credit(
          lTData.referenceOrderId,
          lTData.orderType,
          lTData.customerId,
          lTData.credit,
          lTData.currencyId
        )
      );
    }

    if (newCredits > 0) {
      orderItemPromises.push(
        this.context.transaction.save({
          referenceOrderId: orderSetId,
          orderType: paymentStatusOrderType.ORDER_SET,
          action: transactionAction.REFUND,
          type: transactionType.CREDITED,
          customerId,
          currencyId: brandLocation.currencyId,
          amount: newCredits,
        })
      );
    }

    await Promise.all(orderItemPromises);

    if (discoveryCreditGenerate > 0 && discoveryCreditRedemptionId) {
      discoveryPromises.push(
        this.context.loyaltyTransaction.credit(
          lTData.referenceOrderId,
          loyaltyTransactionType.DISCOVERY_CREDITS_REFUND,
          lTData.customerId,
          discoveryCreditGenerate,
          lTData.currencyId
        )
      );
      discoveryPromises.push(
        this.context.discoveryCreditRedemption.save({
          id: discoveryCreditRedemptionId,
          refunded: true,
        })
      );
    }
    await Promise.all(discoveryPromises);
  }

  async validateOrderItemsRefund(orderSetId, orderItems) {
    const errors = [];
    const { customerId, refunded } = await this.context.orderSet.getById(
      orderSetId
    );
    if (!customerId) {
      errors.push(orderItemsRefundError.INVALID_ORDER);
    }
    const statusHistory = await this.context.paymentStatus.getAllByOrderSetId(
      orderSetId
    );

    const currentStatus = first(statusHistory);
    if (currentStatus.name !== paymentStatusName.PAYMENT_SUCCESS) {
      errors.push(orderItemsRefundError.NOT_PAID);
    }
    if (refunded) {
      errors.push(orderItemsRefundError.ALREADY_REFUNDED);
    }
    // find all order items
    const orderItemsDB = await this.context.orderItem.getByOrderSetId(
      orderSetId
    );

    let item;
    orderItems.forEach(orderItem => {
      item = find(orderItemsDB, o => {
        return o.id === orderItem.id;
      });
      // remaining quantity
      const remainingQuantity =
        parseFloat(item.quantity) - parseFloat(item.refundedQuantity);
      // if quantity is valid and item is not already refunded.
      if (parseFloat(orderItem.quantity) > remainingQuantity) {
        errors.push(orderItemsRefundError.INVALID_QUANTITY);
      }
      if (item.refunded) {
        errors.push(orderItemsRefundError.ALREADY_REFUNDED);
      }
    });
    return errors;
  }
  // in new create order flow already been fetched the menu items
  // no longer needed to fetch menu items and menu options again
  saveMenuItems(menuItems) {
    return super.save(menuItems);
  }
  async save(input) {
    // Look for and exclude any embedded options
    const itemsWithoutOptions = isArray(input)
      ? map(input, omitFp(['selectedOptions', 'type']))
      : omit(input, ['selectedOptions', 'type']);

    // Array of orderItemIds just generated
    await super.save(itemsWithoutOptions);

    // NOTE: We commented because this code is very old
    // and some structures are malformed !!!

    // const options = flatten(
    //   await Promise.all(
    //     map(input, async (orderItem, ix) => {
    //       const newOrderItem = await Promise.all(
    //         map(orderItem.selectedOptions, async selectedOption => {
    //           const menuItemOption = await this.context.menuItemOption.getById(
    //             selectedOption.optionId
    //           );
    //           return assign({}, pick(selectedOption, ['price']), {
    //             orderItemId: orderItemIds[ix],
    //             menuItemOptionId: selectedOption.optionId,
    //             value: menuItemOption.value,
    //             valueAr: menuItemOption.valueAr,
    //             valueTr: menuItemOption.valueTr,
    //             compareAtPrice: menuItemOption.compareAtPrice,
    //           });
    //         })
    //       );
    //
    //       return newOrderItem;
    //     })
    //   )
    // );
    // if (options.length > 0) await this.context.orderItemOption.save(options);
    // return orderItemIds;
  }

  async orderItemsAvailability({ orderSetId, brandLocationId }) {
    const orderSetItems = await this.context.orderItem.getByOrderSetId(orderSetId);
    const menu = await this.context.brandLocation.calculateMenu(brandLocationId);
    const menuItems = flatten(await Promise.all(map(menu.sections, async section => {
      return section.items;
    })));
    let item;
    const missingItemIds = [];
    const newItemList = [];
    const missingItemNames = [];
    for (const orderItem of orderSetItems) {
      item = find(menuItems, m => {
        return m.id === orderItem.menuItemId;
      });
      if (item && !item.soldOut) {
        const itemOptionsFromMenu = flatten(await Promise.all(map(item.optionSets, async optionSet => {
          return optionSet.options;
        })));
        const itemOptions = await this.context.orderItemOption.getAllForOrderItemId(orderItem.id);
        const selectedOptions = [];
        for (const itemOption of itemOptions) {
          const option = itemOption;
          const availableOption = find(itemOptionsFromMenu, m => {
            return m.id === itemOption.menuItemOptionId;
          });
          if (!availableOption) {
            missingItemNames.push(item.name);
            missingItemIds.push(item.id);
            break;
          } else if ((Number(availableOption.price) != Number(itemOption.price))) {
            option.price = availableOption.price;
            selectedOptions.push(option);
          } else {
            selectedOptions.push(option);
          }
        }
        orderItem.selectedOptions = selectedOptions;
        newItemList.push(orderItem);
      } else {
        missingItemIds.push(orderItem.menuItemId);
        missingItemNames.push(orderItem.name);
      }
    }
    const availableItems = newItemList.filter(item => !includes(missingItemIds, item.menuItemId));
    let availabilityStatus = orderItemsAvailability.ALL_ITEMS_AVAILABLE;
    if (availableItems.length == 0) {
      availabilityStatus = orderItemsAvailability.NO_ITEMS_AVAILABLE;
    } else if (missingItemIds.length == 0) {
      availabilityStatus = orderItemsAvailability.ALL_ITEMS_AVAILABLE;
    } else {
      availabilityStatus = orderItemsAvailability.PARTIAL_ITEMS_AVAILABLE;
    }
    const orderSet = await this.context.orderSet.getById(orderSetId);
    orderSet.items = availableItems;
    return { missingItemNames, orderSet, availabilityStatus };
  }
}

module.exports = OrderItem;
