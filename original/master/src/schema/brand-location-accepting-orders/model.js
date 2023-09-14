const BaseModel = require('../../base-model');
const { createLoaders } = require('./loaders');
const { brandLocationStoreStatus } = require('../brand-location/enums');
const { find } = require('lodash');
const moment = require('moment');

class BrandLocationAvailability extends BaseModel {
  constructor(db, context) {
    super(db, 'brand_location_accepting_orders', context);
    this.loaders = createLoaders(this);
  }

  async checkAndUpdateAcceptingOrder(brandLocationId, acceptingOrders) {
    if (acceptingOrders) {
      const fulfillmentsStatus = await this.context.brandLocation.getNewStoreFulfillmentStatusById(brandLocationId);
      const brandLocation = await this.context.brandLocation.getById(brandLocationId);
      let isAcceptingOrder = false;
      let isBusy = false;
      let availableFulfillment = false;
      if (brandLocation.hasPickup) {
        availableFulfillment = true;
        if (
          fulfillmentsStatus.pickup.storeStatus === brandLocationStoreStatus.STORE_OPEN ||
          fulfillmentsStatus.pickup.storeStatus === brandLocationStoreStatus.STORE_CLOSING_SOON
        ) {
          isAcceptingOrder = true;
        } else if (fulfillmentsStatus.pickup.isBusy) {
          isBusy = true;
        }
      }
      if (brandLocation.allowDeliverToCar) {
        availableFulfillment = true;
        if (
          fulfillmentsStatus.car.storeStatus === brandLocationStoreStatus.STORE_OPEN ||
          fulfillmentsStatus.car.storeStatus === brandLocationStoreStatus.STORE_CLOSING_SOON
        ) {
          isAcceptingOrder = true;
        } else if (fulfillmentsStatus.car.isBusy) {
          isBusy = true;
        }
      }

      if (brandLocation.hasDelivery) {
        availableFulfillment = true;
        if (
          fulfillmentsStatus.delivery.storeStatus === brandLocationStoreStatus.STORE_OPEN ||
          fulfillmentsStatus.delivery.storeStatus === brandLocationStoreStatus.STORE_CLOSING_SOON
        ) {
          isAcceptingOrder = true;
        } else if (fulfillmentsStatus.delivery.isBusy) {
          isBusy = true;
        }
      }

      if (brandLocation.allowExpressDelivery) {
        availableFulfillment = true;
        if (
          fulfillmentsStatus.expressDelivery.storeStatus === brandLocationStoreStatus.STORE_OPEN ||
          fulfillmentsStatus.expressDelivery.storeStatus === brandLocationStoreStatus.STORE_CLOSING_SOON
        ) {
          isAcceptingOrder = true;
        } else if (fulfillmentsStatus.expressDelivery.isBusy) {
          isBusy = true;
        }
      }

      if (availableFulfillment && !isBusy && !isAcceptingOrder) {
        const openTimes = await this.findOpenTime(brandLocationId);
        const insertedData = {
          brandLocationId,
          status: true,
        };
        let insertData = true;
        if (brandLocation.hasPickup) {
          if (openTimes.pickupEndTime) {
            insertedData.pickupEndTime = openTimes.pickupEndTime.clone();
            insertedData.pickup = true;
          } else insertData = false;
        }
        if (brandLocation.allowDeliverToCar) {
          if (openTimes.carEndTime) {
            insertedData.carEndTime = openTimes.carEndTime.clone();
            insertedData.car = true;
          } else insertData = false;
        } if (brandLocation.hasDelivery) {
          if (openTimes.deliveryEndTime) {
            insertedData.deliveryEndTime = openTimes.deliveryEndTime.clone();
            insertedData.delivery = true;
          } else insertData = false;
        } if (brandLocation.allowExpressDelivery) {
          if (openTimes.expressDeliveryEndTime) {
            insertedData.expressDeliveryEndTime = openTimes.expressDeliveryEndTime.clone();
            insertedData.expressDelivery = true;
          } else insertData = false;
        }
        if (!(insertedData.pickup || insertedData.car || insertedData.delivery || insertedData.expressDelivery) || !insertData) {
          return null;
        }
        return {id: await super.save(insertedData)};
      }
      /*
      const status = isBusy ? 'BUSY' : (isAcceptingOrder ? 'ACCEPTING_ORDER' : 'NOT_ACCEPTING_ORDER');
      if (status !== 'ACCEPTING_ORDER') {
        const brandLocation = await this.context.brandLocation.getById(brandLocationId);
        const openTimes = await this.findOpenTime(brandLocationId);
        const insertedData = {
          brandLocationId,
          status: true,
        };
        if (brandLocation.hasPickup) {
          if (openTimes.pickupEndTime) {
            insertedData.pickupEndTime = openTimes.pickupEndTime.clone();
            insertedData.pickup = true;
          }
        }
        if (brandLocation.allowDeliverToCar) {
          if (openTimes.carEndTime) {
            insertedData.carEndTime = openTimes.carEndTime.clone();
            insertedData.car = true;
          }
        } if (brandLocation.hasDelivery) {
          if (openTimes.deliveryEndTime) {
            insertedData.deliveryEndTime = openTimes.deliveryEndTime.clone();
            insertedData.delivery = true;
          }
        } if (brandLocation.allowExpressDelivery) {
          if (openTimes.expressDeliveryEndTime) {
            insertedData.expressDeliveryEndTime = openTimes.expressDeliveryEndTime.clone();
            insertedData.expressDelivery = true;
          }
        }
        if (!(insertedData.pickup || insertedData.car || insertedData.delivery || insertedData.expressDelivery)) {
          return null;
        }
        return {id: await super.save(insertedData)};
      }
      */
    } else {
      await this.db(this.tableName)
        .where('status', true)
        .where('brand_location_id', brandLocationId)
        .andWhereRaw(`
          ((pickup = true and NOW() < pickup_end_time) or 
          (car = true and NOW() < car_end_time) or
          (delivery = true and NOW() < delivery_end_time) or
          (express_delivery = true and NOW() < express_delivery_end_time))
        `)
        .update({status: false});
    }
  }

  async cleanAcceptingOrder(brandLocationId) {
    await this.db(this.tableName)
      .where('status', true)
      .where('brand_location_id', brandLocationId)
      .andWhereRaw(`
          ((pickup = true and NOW() < pickup_end_time) or 
          (car = true and NOW() < car_end_time) or
          (delivery = true and NOW() < delivery_end_time) or
          (express_delivery = true and NOW() < express_delivery_end_time))
        `)
      .update({status: false});
  }

  async getActiveAcceptingOrder(brandLocationId) {
    const query = this.roDb(this.tableName)
      .select('*')
      .where('status', true)
      .where('brand_location_id', brandLocationId)
      .andWhereRaw(`
        ((pickup = true and NOW() < pickup_end_time) or 
        (car = true and NOW() < car_end_time) or
        (delivery = true and NOW() < delivery_end_time) or
        (express_delivery = true and NOW() < express_delivery_end_time))
      `);
    return await query;
  }

  async findOpenTime(brandLocationId) {
    const weeklySchedules = await this.context.brandLocationWeeklySchedule.getByBrandLocationId(brandLocationId);
    const closeTimes = {
      pickupEndTime: null,
      carEndTime: null,
      deliveryEndTime: null,
      expressDeliveryEndTime: null,
    };
    const fulfillments = [];
    const brandLocation = await this.context.brandLocation.getById(brandLocationId);
    if (brandLocation.hasPickup) fulfillments.push({ type: 'PICKUP', openAllKey: 'pickupOpenAllDay', scheduleInfo: 'pickupScheduleInfo', endTimeKey: 'pickupEndTime'});
    if (brandLocation.allowDeliverToCar) fulfillments.push({ type: 'CAR', openAllKey: 'carOpenAllDay', scheduleInfo: 'carScheduleInfo', endTimeKey: 'carEndTime' });
    if (brandLocation.hasDelivery) fulfillments.push({ type: 'DELIVERY', openAllKey: 'deliveryOpenAllDay', scheduleInfo: 'deliveryScheduleInfo', endTimeKey: 'deliveryEndTime' });
    if (brandLocation.allowExpressDelivery) fulfillments.push({ type: 'EXPRESS_DELIVERY', openAllKey: 'expressDeliveryOpenAllDay', scheduleInfo: 'expressDeliveryScheduleInfo', endTimeKey: 'expressDeliveryEndTime'});

    if (weeklySchedules.length > 0) {
      const nowTimezoned = moment().clone().tz(brandLocation.timeZoneIdentifier);
      const currentDayOfWeek = nowTimezoned.day();
      const nextDayOfWeek = (currentDayOfWeek + 1) % 7;
      const currentWeeklySchedule = find(weeklySchedules, weeklySchedule => weeklySchedule.day == currentDayOfWeek);
      const nextWeeklySchedule = find(weeklySchedules, weeklySchedule => weeklySchedule.day == nextDayOfWeek);
      for (let index = 0; index < fulfillments.length; index++) {
        const fulfillment = fulfillments[index];
        if (currentWeeklySchedule) {
          if (currentWeeklySchedule[fulfillment.openAllKey]) {
            continue;
          } else if (currentWeeklySchedule[fulfillment.scheduleInfo]) {
            const scheduleInfo = currentWeeklySchedule[fulfillment.scheduleInfo];
            if (scheduleInfo && scheduleInfo.length > 0) {
              const firstSchedule = scheduleInfo[0];
              let startingTime = firstSchedule.openTime.split(':');
              const openTime = nowTimezoned.clone();
              openTime.set({
                hour: startingTime[0],
                minute: startingTime[1],
                second: startingTime[2],
                millisecond: 0,
              });
              if (nowTimezoned.isBefore(openTime)) {
                closeTimes[fulfillment.endTimeKey] = openTime;
                continue;
              } else {
                const lastSchedule = scheduleInfo[scheduleInfo.length - 1];
                startingTime = lastSchedule.openTime.split(':');
                openTime.set({
                  hour: startingTime[0],
                  minute: startingTime[1],
                  second: startingTime[2],
                  millisecond: 0,
                });
                const closeTime = openTime.clone().add(lastSchedule.openDuration, 'm');
                if (closeTime.isAfter(nowTimezoned)) {
                  continue;
                }
              }
            }
          }
        }
        if (closeTimes[fulfillment.endTimeKey] === null && nextWeeklySchedule) {
          if (nextWeeklySchedule[fulfillment.openAllKey]) {
            closeTimes[fulfillment.endTimeKey] = nowTimezoned.clone().add(1, 'days').startOf('day');
          } else if (nextWeeklySchedule[fulfillment.scheduleInfo]) {
            const scheduleInfo = nextWeeklySchedule[fulfillment.scheduleInfo];
            if (scheduleInfo && scheduleInfo.length > 0) {
              const firstSchedule = scheduleInfo[0];
              const startingTime = firstSchedule.openTime.split(':');
              const openTime = nowTimezoned.clone().add(1, 'days');
              openTime.set({
                hour: startingTime[0],
                minute: startingTime[1],
                second: startingTime[2],
                millisecond: 0,
              });
              closeTimes[fulfillment.endTimeKey] = openTime.clone();
            }
          }
        }
      }
      return closeTimes;
    } else {
      return closeTimes;
    }
  }
}

module.exports = BrandLocationAvailability;
