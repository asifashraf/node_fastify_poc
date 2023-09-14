//const { getCachedOpenings } = require('./redis-helper');
//const { calculateOpeningsKey } = require('./redis-helper');
const { assign, pick, isEmpty, find } = require('lodash');

const { addLocalizationField } = require('../../lib/util');
const { orderFulfillmentTypes } = require('../order-set/enums');
const { brandLocationStoreStatus, brandLocationStoreStatusFull, fulfillmentTypesWithKey, weekDaysTranslate, fulFillmentIcons } = require('./enums');
const {
  countryConfigurationKeys,
} = require('../root/enums');
const moment = require('moment');
const { iconPlacementEnum } = require('../home-page-card-list-item/enum');

module.exports = {
  BrandLocation: {
    brand({ brandId, brand }, args, context) {
      if (!brand) {
        return context.brand
          .getById(brandId)
          .then(brand => addLocalizationField(
            addLocalizationField(brand, 'name'),
            'brandDescription'
          ));
      }
      const localized = addLocalizationField(brand, 'name');
      return localized;
    },
    /*
    async brand({ brandId, brand }, args, context) {
      if (!brand) {
        return addLocalizationField(
          await context.brand.getById(brandId),
          'name'
        );
      }
      return addLocalizationField(brand, 'name');
    },
     */
    availableFulfillments(root, args, context) {
      return context.brandLocation.getAllAvailableFulfillmentTypes(root);
    },
    async neighborhoods({ id }, args, context) {
      return addLocalizationField(
        await context.neighborhood.getByBrandLocation(id),
        'name'
      );
    },
    address(root) {
      return addLocalizationField(
        assign(
          {},
          { id: root.brandLocationAddressId },
          pick(root, [
            'shortAddress',
            'shortAddressAr',
            'shortAddressTr',
            'neighborhoodId',
            'street',
            'city',
            'cityId',
            'longitude',
            'latitude',
          ])
        ),
        'shortAddress'
      );
    },
    async menu({ id, brandId }, args, context) {
      const [{ countryId }] = await context.db
        .select('cities.country_id')
        .from('brand_locations')
        .innerJoin(
          'brand_location_addresses',
          'brand_location_addresses.brand_location_id',
          'brand_locations.id'
        )
        .innerJoin('cities', 'cities.id', 'brand_location_addresses.city_id')
        .where('brand_locations.id', id);
      return context.menu.getByBrandAndCountry(brandId, countryId);
    },
    async cMenu({ id }, args, context) {
      return context.brandLocation.calculateMenu(id);
    },
    scheduleExceptions({ id }, args, context) {
      return context.scheduleException.getByBrandLocation(id);
    },
    weeklySchedule({ id }, args, context) {
      return context.weeklySchedule.getByBrandLocation(id);
    },
    async deliverySchedule({ id }, args, context) {
      const schedule = await context.weeklySchedule.getByBrandLocation(id);
      schedule.forEach((day, i) => {
        if (!schedule[i].openAllDay) {
          schedule[i].openTime = schedule[i].deliveryOpenTime;
          schedule[i].openDuration = schedule[i].deliveryOpenDuration;
          // delete schedule[i].deliveryOpenTime;
          // delete schedule[i].deliveryOpenDuration;
        }
      });
      return schedule;
    },
    async expressDeliverySchedule({ id }, args, context) {
      const schedule = await context.weeklySchedule.getByBrandLocation(id);
      schedule.forEach((day, i) => {
        if (!schedule[i].openAllDay) {
          schedule[i].openTime = schedule[i].expressDeliveryOpenTime;
          schedule[i].openDuration = schedule[i].expressDeliveryOpenDuration;
          // delete schedule[i].deliveryOpenTime;
          // delete schedule[i].deliveryOpenDuration;
        }
      });
      return schedule;
    },
    deliveryLocation({ deliveryLocationId }, args, context) {
      if (!deliveryLocationId) return null;
      return context.brandLocation.getById(deliveryLocationId);
    },
    async openings(
      root,
      { timespanStart, numberOfDaysToScan },
      context
    ) {
      /*
      if (!timespanStart) timespanStart = now.get();
      const openingsCacheKey = await calculateOpeningsKey(id, {
        timespanStart,
        numberOfDaysToScan,
      });
      let openings = await getCachedOpenings(openingsCacheKey);
      if (!openings) {
        openings = await context.brandLocation.openings(
          id,
          timeZoneIdentifier,
          timespanStart,
          numberOfDaysToScan
        );
      }

      return {
        expressDelivery: allowExpressDelivery ? openings.expressDelivery : [],
        delivery: hasDelivery ? openings.delivery : [],
        pickup: hasPickup ? openings.pickup : [],
      };
      */
      const weeklySchedules = await context.brandLocationWeeklySchedule.getByBrandLocationId(root.id);
      const response = {
        expressDelivery: [],
        delivery: [],
        pickup: [],
        car: []
      };
      if (weeklySchedules.length > 0) {
        const nowTimezoned = moment().clone().tz(root.timeZoneIdentifier);
        const currentDayOfWeek = nowTimezoned.day();
        const previousDayOfWeek = (currentDayOfWeek + 6) % 7;
        const currentWeeklySchedule = find(weeklySchedules, weeklySchedule => weeklySchedule.day == currentDayOfWeek);
        const previousWeeklySchedule = find(weeklySchedules, weeklySchedule => weeklySchedule.day == previousDayOfWeek);
        fulfillmentTypesWithKey.map(fulfillmentTypeWithKey => {
          if (root[fulfillmentTypeWithKey.enableKey]) {
            if (currentWeeklySchedule && currentWeeklySchedule[fulfillmentTypeWithKey.openAllDay]) {
              response[fulfillmentTypeWithKey.name].push({
                begin: nowTimezoned.clone().startOf('day'),
                end: nowTimezoned.clone().add(1, 'days').startOf('day')
              });
            } else {
              let previousScheduleWorking = false;
              if (previousWeeklySchedule && !previousWeeklySchedule[fulfillmentTypeWithKey.openAllDay]) {
                const previousScheduleInfo = previousWeeklySchedule[fulfillmentTypeWithKey.scheduleInfo];
                if (previousScheduleInfo && previousScheduleInfo.length > 0) {
                  previousScheduleInfo.map(schedule => {
                    const startingTime = schedule.openTime.split(':');
                    const openTime = nowTimezoned.clone();
                    openTime.set({
                      hour: startingTime[0],
                      minute: startingTime[1],
                      second: startingTime[2],
                      millisecond: 0,
                    });
                    openTime.subtract(1, 'd');
                    const closeTime = openTime.clone().add(schedule.openDuration, 'm');
                    if (closeTime.isAfter(nowTimezoned)) {
                      previousScheduleWorking = true;
                      response[fulfillmentTypeWithKey.name].push({
                        begin: openTime,
                        end: closeTime
                      });
                    }
                  });
                }
              }
              if (!previousScheduleWorking && currentWeeklySchedule) {
                const scheduleInfo = currentWeeklySchedule[fulfillmentTypeWithKey.scheduleInfo];
                if (scheduleInfo && scheduleInfo.length > 0) {
                  scheduleInfo.map(schedule => {
                    const startingTime = schedule.openTime.split(':');
                    const openTime = nowTimezoned.clone();
                    openTime.set({
                      hour: startingTime[0],
                      minute: startingTime[1],
                      second: startingTime[2],
                      millisecond: 0,
                    });
                    const closeTime = openTime.clone().add(schedule.openDuration, 'm');
                    response[fulfillmentTypeWithKey.name].push({
                      begin: openTime,
                      end: closeTime
                    });
                  });
                }
              }
            }
          }
        });
      }
      return response;
    },
    /**DEPRECATED */
    async openingsNew(
      { id, timeZoneIdentifier, hasPickup, allowDeliverToCar, hasDelivery, allowExpressDelivery },
      args,
      context
    ) {
      const fulfillmentsStatus = await context.brandLocation.getNewStoreFulfillmentStatusById(
        id
      );
      const response = {
        expressDelivery: [],
        delivery: [],
        pickup: [],
        car: []
      };
      if (
        hasPickup && fulfillmentsStatus?.pickup?.opening.length > 0
      ) {
        response.pickup = fulfillmentsStatus.pickup.opening.map(opening => {
          return { begin: moment(opening.begin).tz(timeZoneIdentifier), end: moment(opening.end).tz(timeZoneIdentifier)};
        });
      }
      if (
        allowDeliverToCar && fulfillmentsStatus?.car?.opening.length > 0
      ) {
        response.car = fulfillmentsStatus.car.opening.map(opening => {
          return { begin: moment(opening.begin).tz(timeZoneIdentifier), end: moment(opening.end).tz(timeZoneIdentifier)};
        });
      }
      if (
        hasDelivery && fulfillmentsStatus?.delivery?.opening.length > 0
      ) {
        response.delivery = fulfillmentsStatus.delivery.opening.map(opening => {
          return { begin: moment(opening.begin).tz(timeZoneIdentifier), end: moment(opening.end).tz(timeZoneIdentifier)};
        });
      }
      if (
        allowExpressDelivery && fulfillmentsStatus?.expressDelivery?.opening.length > 0
      ) {
        response.expressDelivery = fulfillmentsStatus.expressDelivery.opening.map(opening => {
          return { begin: moment(opening.begin).tz(timeZoneIdentifier), end: moment(opening.end).tz(timeZoneIdentifier)};
        });
      }
      return response;
    },
    async currency({ currencyId }, args, context) {
      return addLocalizationField(
        addLocalizationField(
          await context.currency.getById(currencyId),
          'symbol'
        ),
        'subunitName'
      );
    },
    priceRules({ id }, args, context) {
      return context.brandLocationPriceRule.getByBrandLocation(id);
    },
    brandLocationAdmins({ id, brandId }, args, context) {
      return context.brandAdmin.getByBrandAndBrandLocationId(brandId, id);
    },
    async discoveryCreditAvailable(
      { brandId, discoveryCreditAvailable },
      args,
      context
    ) {
      if (typeof discoveryCreditAvailable !== 'undefined')
        return discoveryCreditAvailable;
      const brand = await context.brand.getById(brandId);
      const customerId = context.auth.id;
      return context.discoveryCreditRedemption.discoveryCreditAvailable({
        brandId,
        countryId: brand ? brand.countryId : null,
        customerId,
      });
    },
    facilities({ id }, args, context) {
      return context.brandLocationFacility.getByBrandLocation(id);
    },
    async storeStatus(root, args, context) {
      if (root.storeStatus) return root.storeStatus;
      const fulfillmentsStatus = await context.brandLocation.getNewStoreFulfillmentStatusById(root.id);
      let storeStatus = brandLocationStoreStatusFull.STORE_CLOSED;
      if (args?.filter?.fulfillmentType) {
        const tempStoreStatus = fulfillmentsStatus[args.filter.fulfillmentType];
        storeStatus = tempStoreStatus.storeStatus;
        if (tempStoreStatus?.isBusy) {
          storeStatus = brandLocationStoreStatusFull.STORE_BUSY;
        }
      } else {
        let isBusyTemp = false;
        fulfillmentTypesWithKey.map(fulfillmentType => {
          if (fulfillmentsStatus[fulfillmentType.name]) {
            const tempStoreStatus = fulfillmentsStatus[fulfillmentType.name];
            if (tempStoreStatus?.storeStatus && root[fulfillmentType.enableKey]) {
              isBusyTemp = isBusyTemp || tempStoreStatus.isBusy;
              if (tempStoreStatus.storeStatus === brandLocationStoreStatus.STORE_OPEN) {
                storeStatus = brandLocationStoreStatus.STORE_OPEN;
              } else if (
                tempStoreStatus.storeStatus ===
                brandLocationStoreStatus.STORE_CLOSING_SOON &&
                storeStatus !== brandLocationStoreStatus.STORE_OPEN
              ) {
                storeStatus = brandLocationStoreStatus.STORE_CLOSING_SOON;
              }
            }
          }
        });
        if (storeStatus == brandLocationStoreStatusFull.STORE_CLOSED && isBusyTemp) {
          storeStatus = brandLocationStoreStatusFull.STORE_BUSY;
        }
      }
      return storeStatus;
    },
    async currentAvailableFulfillments(root, args, context) {
      if (root.currentAvailableFulfillments) {
        return root.currentAvailableFulfillments;
      }

      const fulfillmentsStatus = await context.brandLocation.getNewStoreFulfillmentStatusById(
        root.id
      );
      const availableFulfillments = [];
      if (
        fulfillmentsStatus.pickup.storeStatus === brandLocationStoreStatus.STORE_OPEN ||
        fulfillmentsStatus.pickup.storeStatus === brandLocationStoreStatus.STORE_CLOSING_SOON
      ) {
        availableFulfillments.push(orderFulfillmentTypes.PICKUP);
      }
      if (
        fulfillmentsStatus.delivery.storeStatus === brandLocationStoreStatus.STORE_OPEN ||
        fulfillmentsStatus.delivery.storeStatus === brandLocationStoreStatus.STORE_CLOSING_SOON
      ) {
        availableFulfillments.push(orderFulfillmentTypes.DELIVERY);
      }
      if (
        fulfillmentsStatus.expressDelivery.storeStatus === brandLocationStoreStatus.STORE_OPEN ||
        fulfillmentsStatus.expressDelivery.storeStatus === brandLocationStoreStatus.STORE_CLOSING_SOON
      ) {
        availableFulfillments.push(orderFulfillmentTypes.EXPRESS_DELIVERY);
      }
      if (
        fulfillmentsStatus.car.storeStatus === brandLocationStoreStatus.STORE_OPEN ||
        fulfillmentsStatus.car.storeStatus === brandLocationStoreStatus.STORE_CLOSING_SOON
      ) {
        availableFulfillments.push(orderFulfillmentTypes.CAR);
      }
      return availableFulfillments;
    },
    async pairingDevices({ id }, args, context) {
      const devices = await context.brandLocationDevice.getDevicesByBrandLocation(
        id
      );
      const deviceIds = [];
      await Promise.all(
        devices.map(device => {
          deviceIds.push(device.deviceId);
          return device;
        })
      );
      return deviceIds;
    },
    contact({ contact }, args, context) {
      return isEmpty(contact) ? [] : (Array.isArray(contact) ? contact : [contact]);
    },
    orderRatingScore({ id }, args, context) {
      return context.orderRating.getBranchScore(id);
    },
    orderRatingScoreByFulfillment({ id }, args, context) {
      return context.orderRating.getBranchScoreWithFulfillment(id);
    },
    async tags({ id }, args, context) {
      return context.tagRelation.getTagsByRelId(id);
    },
    async busyStatusByFulfillmentType({ id }, args, context) {
      const availabilities = await context.brandLocationAvailability.getActiveAvailabilityByBrandLocationId(id);
      const FULFILLMENT_KEYS = [
        { nameKey: 'pickup', endTimeKey: 'pickupEndTime'},
        { nameKey: 'car', endTimeKey: 'carEndTime'},
        { nameKey: 'delivery', endTimeKey: 'deliveryEndTime' },
        { nameKey: 'expressDelivery', endTimeKey: 'expressDeliveryEndTime'}
      ];
      const response = {};
      if (availabilities.length > 0) {
        FULFILLMENT_KEYS.map(fulfillmentType => {
          const tempAvai = availabilities.filter(availability => availability[fulfillmentType.nameKey]);
          if (tempAvai.length > 0) {
            let busyTime = moment();
            tempAvai.map(availability => {
              const busyTimeTemp = availability[fulfillmentType.endTimeKey];
              if (moment(busyTimeTemp).isAfter(busyTime)) busyTime = moment(busyTimeTemp);
            });
            response[fulfillmentType.nameKey] = {isBusy: true, busyTime};
          } else {
            response[fulfillmentType.nameKey] = {isBusy: false, busyTime: null};
          }
        });
      } else {
        FULFILLMENT_KEYS.map(fulfillmentType => {
          response[fulfillmentType.nameKey] = {isBusy: false, busyTime: null};
        });
      }
      return response;
    },
    async branchStatusInfo(root, args, context) {
      if (root.branchStatusInfo) return root.branchStatusInfo;
      const fulfillmentsStatus = await context.brandLocation.getNewStoreFulfillmentStatusById(root.id);
      let storeStatus = brandLocationStoreStatusFull.STORE_CLOSED;
      let openingTimeTemp = null;
      let closingTimeTemp = null;
      let statusDescription = null;
      let allSchedulesInconsistency = true;
      const busyStatusWithFulfillment = [];
      let isBusyTemp = false;
      let isAllDayClosed = true;
      let allWeekClosed = true;
      let openTimeNextWeekDay = null;
      let openNextWeekDay = null;
      if (args?.filter?.fulfillmentType) {
        const tempStoreStatus = fulfillmentsStatus[args.filter.fulfillmentType];
        storeStatus = tempStoreStatus.storeStatus;
        isBusyTemp = tempStoreStatus.isBusy;
        isAllDayClosed = tempStoreStatus.isAllDayClosed;
        if (isAllDayClosed) {
          allWeekClosed = tempStoreStatus?.allWeekClosed || false;
          openNextWeekDay = isNaN(tempStoreStatus.openNextWeekDay) ? null : tempStoreStatus.openNextWeekDay;
          openTimeNextWeekDay = tempStoreStatus?.openTimeNextWeekDay || null;
        }
        if (tempStoreStatus.opening.length > 0) {
          closingTimeTemp = moment(tempStoreStatus.opening[0].end);
          openingTimeTemp = moment(tempStoreStatus.opening[0].begin);
        }
      } else {
        fulfillmentTypesWithKey.map(fulfillmentType => {
          if (fulfillmentsStatus[fulfillmentType.name]) {
            const tempStoreStatus = fulfillmentsStatus[fulfillmentType.name];
            if (tempStoreStatus?.storeStatus && root[fulfillmentType.enableKey]) {
              busyStatusWithFulfillment.push({
                isBusy: tempStoreStatus.isBusy,
                busyTime: tempStoreStatus.busyTime,
                fulfillmentType: fulfillmentType.type
              });
              isBusyTemp = isBusyTemp || tempStoreStatus.isBusy;
              isAllDayClosed = isAllDayClosed && tempStoreStatus.isAllDayClosed;
              allSchedulesInconsistency = false;
              if (tempStoreStatus.storeStatus === brandLocationStoreStatus.STORE_OPEN) {
                allWeekClosed = false;
                storeStatus = brandLocationStoreStatus.STORE_OPEN;
                if (!closingTimeTemp || closingTimeTemp.isBefore(moment(tempStoreStatus.opening[0].end))) {
                  closingTimeTemp = moment(tempStoreStatus.opening[0].end);
                }
                if (!openingTimeTemp || openingTimeTemp.isAfter(moment(tempStoreStatus.opening[0].begin))) {
                  openingTimeTemp = moment(tempStoreStatus.opening[0].begin);
                }
              } else if (
                tempStoreStatus.storeStatus ===
                brandLocationStoreStatus.STORE_CLOSING_SOON &&
                storeStatus !== brandLocationStoreStatus.STORE_OPEN
              ) {
                allWeekClosed = false;
                storeStatus = brandLocationStoreStatus.STORE_CLOSING_SOON;
                if (!closingTimeTemp || closingTimeTemp.isBefore(moment(tempStoreStatus.opening[0].end))) {
                  closingTimeTemp = moment(tempStoreStatus.opening[0].end);
                }
                if (!openingTimeTemp || openingTimeTemp.isAfter(moment(tempStoreStatus.opening[0].begin))) {
                  openingTimeTemp = moment(tempStoreStatus.opening[0].begin);
                }
              } else if (tempStoreStatus.storeStatus === brandLocationStoreStatus.STORE_CLOSED && !tempStoreStatus.isAllDayClosed) {
                if (!openingTimeTemp || openingTimeTemp.isAfter(moment(tempStoreStatus.opening[0].begin))) {
                  openingTimeTemp = moment(tempStoreStatus.opening[0].begin);
                }
                if (!closingTimeTemp || closingTimeTemp.isBefore(moment(tempStoreStatus.opening[0].end))) {
                  closingTimeTemp = moment(tempStoreStatus.opening[0].end);
                }
              } else if (tempStoreStatus.isAllDayClosed) {
                allWeekClosed = allWeekClosed && tempStoreStatus.allWeekClosed;
                if (!isNaN(parseInt(tempStoreStatus.openNextWeekDay))) {
                  if (isNaN(parseInt(openNextWeekDay))) {
                    openNextWeekDay = tempStoreStatus.openNextWeekDay;
                    openTimeNextWeekDay = tempStoreStatus.openTimeNextWeekDay;
                  } else {
                    const current = moment();
                    let nextDay = current.clone().weekday(openNextWeekDay);
                    nextDay = nextDay.isBefore(current) ? nextDay.add(7, 'days') : nextDay;
                    const nextDayOpenTime = openTimeNextWeekDay.split(':');
                    nextDay.set({
                      hour: nextDayOpenTime[0],
                      minute: nextDayOpenTime[1],
                      second: nextDayOpenTime[2],
                      millisecond: 0,
                    });
                    let tempNextDay = current.clone().day(tempStoreStatus.openNextWeekDay);
                    tempNextDay = tempNextDay.isBefore(current) ? tempNextDay.add(7, 'days') : tempNextDay;
                    const tempNextDayOpenTime = tempStoreStatus.openTimeNextWeekDay.split(':');
                    tempNextDay.set({
                      hour: tempNextDayOpenTime[0],
                      minute: tempNextDayOpenTime[1],
                      second: tempNextDayOpenTime[2],
                      millisecond: 0,
                    });
                    if (tempNextDay.isBefore(nextDay)) {
                      openNextWeekDay = tempStoreStatus.openNextWeekDay;
                      openTimeNextWeekDay = tempStoreStatus.openTimeNextWeekDay;
                    }
                  }
                }
              }
            }
          }
        });
      }
      const configurationKeys = [
        countryConfigurationKeys.ESTIMATED_TIME_IN_MINS_PICKUP,
        countryConfigurationKeys.ESTIMATED_TIME_IN_MINS_CAR,
        countryConfigurationKeys.ESTIMATED_TIME_IN_MINS_DELIVERY,
        countryConfigurationKeys.ESTIMATED_TIME_IN_MINS_EXPRESS_DELIVERY,
      ];

      const brand = await context.brand.getById(root.brandId);
      const configurations = await context.countryConfiguration.getByKeys(
        configurationKeys,
        brand.countryId
      );
      if (storeStatus !== brandLocationStoreStatusFull.STORE_CLOSED) {
        statusDescription = {
          en: `Closing at ${closingTimeTemp.tz(root.timeZoneIdentifier).format('LT')}`,
          ar: '\u202B يغلق الساعة \u202C' + `\u202A${closingTimeTemp.tz(root.timeZoneIdentifier).format('hh:mm')}\u202C` + (closingTimeTemp.tz(root.timeZoneIdentifier).format('A') == 'AM' ? ('\u202Bص\u202C') : ('\u202Bم\u202C')),
          tr: `${closingTimeTemp.tz(root.timeZoneIdentifier).format('LT')}'da kapanıyor`
        };
      } else {
        if (allSchedulesInconsistency) {
          storeStatus = brandLocationStoreStatusFull.STORE_CLOSED;
          statusDescription = {
            en: 'Closed',
            ar: 'مغلق',
            tr: 'Kapalı'
          };
        } else {
          storeStatus = isBusyTemp ?
            brandLocationStoreStatusFull.STORE_BUSY :
            brandLocationStoreStatusFull.STORE_CLOSED;
          if (isAllDayClosed) {
            if (allWeekClosed) {
              statusDescription = {
                en: 'Closed for all week',
                ar: '\u202Bمغلق طوال الأسبوع\u202C',
                tr: 'Bütün hafta kapalı'
              };
            } else if (isBusyTemp) {
              statusDescription = {
                en: 'Busy, not currently accepting orders',
                ar: '\u202Bمشغول، لا يستقبل طلبات حاليًا \u202C ',
                tr: 'Meşgul, şu anda sipariş kabul edilmiyor'
              };
            } else {
              const time = moment().tz(root.timeZoneIdentifier);
              const nextDayOpenTime = openTimeNextWeekDay.split(':');
              time.set({
                hour: nextDayOpenTime[0],
                minute: nextDayOpenTime[1],
                second: nextDayOpenTime[2],
                millisecond: 0,
              });
              statusDescription = {
                en: 'Closed, opens ' + weekDaysTranslate[openNextWeekDay].en + ' at ' + time.format('LT'),
                ar: `\u202B ${time.tz(root.timeZoneIdentifier).format('A') == 'AM' ? 'صباحًا' : 'مساءً'} ${time.tz(root.timeZoneIdentifier).format('hh:mm')}\u202C` + `\u202B الساعة ${weekDaysTranslate[openNextWeekDay].ar}مغلق، يفتح في يوم\u202C `,
                tr: `Kapalı, ${weekDaysTranslate[openNextWeekDay].tr} ${time.tz(root.timeZoneIdentifier).format('A') == 'AM' ? 'sabah' : 'öğleden sonra'} ${time.tz(root.timeZoneIdentifier).format('hh:mm')}'da açılır`
              };
            }
          } else {
            if (isBusyTemp) {
              statusDescription = {
                en: 'Busy, not currently accepting orders',
                ar: '\u202Bمشغول، لا يستقبل طلبات حاليًا \u202C ',
                tr: 'Meşgul, şu anda sipariş kabul edilmiyor'
              };
            } else {
              statusDescription = {
                en: 'Closed, opens at ' + openingTimeTemp.tz(root.timeZoneIdentifier).format('LT'),
                ar: `\u202B ${openingTimeTemp.tz(root.timeZoneIdentifier).format('A') == 'AM' ? 'صباحًا' : 'مساءً'} ${openingTimeTemp.tz(root.timeZoneIdentifier).format('hh:mm')}\u202C` + '\u202Bالمحل مغلق. سيفتح عند الساعة\u202C',
                tr: `Kapalı, ${openingTimeTemp.tz(root.timeZoneIdentifier).format('A') == 'AM' ? 'sabah' : 'öğleden sonra'} ${openingTimeTemp.tz(root.timeZoneIdentifier).format('hh:mm')}'da açılır`
              };
            }
          }
        }
      }
      let fulfillmentDescription = {
        en: 'No active fulfillment',
        ar: '\u202Bلا يوجد خدمة متاحة حالياً\u202C',
        tr: 'Aktif hizmet yok'
      };
      const openList = [brandLocationStoreStatusFull.STORE_CLOSING_SOON, brandLocationStoreStatusFull.STORE_OPEN];
      const fulfillmentDescriptionEn = [];
      let fulfillmentDescriptionAr = '';
      const fulfillmentDescriptionTr = [];
      const storeStatusByFulfillmentType = [];
      fulfillmentTypesWithKey.map(fulfillmentType => {
        if (fulfillmentType.name in fulfillmentsStatus) {
          if (fulfillmentsStatus[fulfillmentType.name]?.storeStatus) {
            if (root[fulfillmentType.enableKey]) {
              storeStatusByFulfillmentType.push({
                status: fulfillmentsStatus[fulfillmentType.name].isBusy ? brandLocationStoreStatusFull.STORE_BUSY : fulfillmentsStatus[fulfillmentType.name].storeStatus,
                fulfillmentType: fulfillmentType.type
              });
            }
            if (openList.includes(fulfillmentsStatus[fulfillmentType.name].storeStatus)) {
              switch (fulfillmentType.type) {
                case 'PICKUP':
                  const confPickup = find(configurations, configuration => configuration.configurationKey == countryConfigurationKeys.ESTIMATED_TIME_IN_MINS_PICKUP);
                  if (confPickup) {
                    fulfillmentDescriptionEn.push('Pick up in ' + confPickup.configurationValue + ' mins');
                    fulfillmentDescriptionAr = fulfillmentDescriptionAr.length == 0
                      ? `\u202Bدقيقة ${confPickup.configurationValue} يمكنك استلام الطلب بعد \u202C`
                      : fulfillmentDescriptionAr + `\u202B/ دقيقة ${confPickup.configurationValue} يمكنك استلام الطلب بعد \u202C`;
                    fulfillmentDescriptionTr.push(confPickup.configurationValue + ' dakika içinde teslim alın');
                  }
                  break;
                case 'CAR':
                  const confCar = find(configurations, configuration => configuration.configurationKey == countryConfigurationKeys.ESTIMATED_TIME_IN_MINS_CAR);
                  if (confCar) {
                    fulfillmentDescriptionEn.push('Served to your car within ' + confCar.configurationValue + ' mins');
                    fulfillmentDescriptionAr = fulfillmentDescriptionAr.length == 0
                      ? `\u202Bدقيقة ${confCar.configurationValue} يمكنك استلام الطلب بعد \u202C`
                      : fulfillmentDescriptionAr + `\u202B/ دقيقة ${confCar.configurationValue} يمكنك استلام الطلب بعد \u202C`;
                    fulfillmentDescriptionTr.push(confCar.configurationValue + ' dakika içinde teslim alın');
                  }
                  break;
                case 'DELIVERY':
                  const confDel = find(configurations, configuration => configuration.configurationKey == countryConfigurationKeys.ESTIMATED_TIME_IN_MINS_DELIVERY);
                  if (confDel) {
                    fulfillmentDescriptionEn.push('Delivery in ' + confDel.configurationValue + ' mins');
                    fulfillmentDescriptionAr = fulfillmentDescriptionAr.length == 0
                      ? `\u202Bدقيقة ${confDel.configurationValue} سيتم التوصيل بعد \u202C`
                      : fulfillmentDescriptionAr + `\u202B/ دقيقة ${confDel.configurationValue} سيتم التوصيل بعد \u202C`;
                    fulfillmentDescriptionTr.push(confDel.configurationValue + ' dakika içinde teslimat');
                  }
                  break;
                case 'EXPRESS_DELIVERY':
                  const confExDel = find(configurations, configuration => configuration.configurationKey == countryConfigurationKeys.ESTIMATED_TIME_IN_MINS_EXPRESS_DELIVERY);
                  if (confExDel) {
                    fulfillmentDescriptionEn.push('Express Delivery in ' + confExDel.configurationValue + ' mins');
                    fulfillmentDescriptionAr = fulfillmentDescriptionAr.length == 0
                      ? `\u202Bدقيقة ${confExDel.configurationValue} سيتم التوصيل السريع خلال \u202C`
                      : fulfillmentDescriptionAr + `\u202B/ دقيقة ${confExDel.configurationValue} سيتم التوصيل السريع خلال \u202C`;
                    fulfillmentDescriptionTr.push(confExDel.configurationValue + ' dakika içinde ekspres teslimat');
                  }
                  break;
                default:
                  break;
              }
            }
          } else {
            if (root[fulfillmentType.enableKey]) {
              storeStatusByFulfillmentType.push({
                status: brandLocationStoreStatusFull.STORE_CLOSED,
                fulfillmentType: fulfillmentType.type
              });
            }
          }
        } else {
          if (root[fulfillmentType.enableKey]) {
            storeStatusByFulfillmentType.push({
              status: brandLocationStoreStatusFull.STORE_CLOSED,
              fulfillmentType: fulfillmentType.type
            });
          }
        }
      });
      if (!isEmpty(fulfillmentDescriptionEn)) {
        fulfillmentDescription = {
          en: fulfillmentDescriptionEn.join(' / '),
          ar: fulfillmentDescriptionAr,
          tr: fulfillmentDescriptionTr.join(' / '),
        };
      }
      const branchStatusInfo = {
        status: storeStatus,
        statusDescription,
        fulfillmentDescription,
        busyStatusByFulfillmentType: busyStatusWithFulfillment,
        statusByFulfillmentType: storeStatusByFulfillmentType
      };
      return branchStatusInfo;
    },
    async branchStatusForAdmin(root, args, context) {
      let status = 'NOT_ACCEPTING_ORDER';
      if (root.acceptingOrders) {
        const fulfillmentsStatus = await context.brandLocation.getNewStoreFulfillmentStatusById(root.id);
        let isAcceptingOrder = false;
        let isBusy = false;
        if (
          fulfillmentsStatus.pickup.storeStatus === brandLocationStoreStatus.STORE_OPEN ||
          fulfillmentsStatus.pickup.storeStatus === brandLocationStoreStatus.STORE_CLOSING_SOON
        ) {
          isAcceptingOrder = true;
        } else if (fulfillmentsStatus.pickup.isBusy) {
          isBusy = true;
        }
        if (
          fulfillmentsStatus.car.storeStatus === brandLocationStoreStatus.STORE_OPEN ||
          fulfillmentsStatus.car.storeStatus === brandLocationStoreStatus.STORE_CLOSING_SOON
        ) {
          isAcceptingOrder = true;
        } else if (fulfillmentsStatus.car.isBusy) {
          isBusy = true;
        }
        if (
          fulfillmentsStatus.delivery.storeStatus === brandLocationStoreStatus.STORE_OPEN ||
          fulfillmentsStatus.delivery.storeStatus === brandLocationStoreStatus.STORE_CLOSING_SOON
        ) {
          isAcceptingOrder = true;
        } else if (fulfillmentsStatus.delivery.isBusy) {
          isBusy = true;
        }
        if (
          fulfillmentsStatus.expressDelivery.storeStatus === brandLocationStoreStatus.STORE_OPEN ||
          fulfillmentsStatus.expressDelivery.storeStatus === brandLocationStoreStatus.STORE_CLOSING_SOON
        ) {
          isAcceptingOrder = true;
        } else if (fulfillmentsStatus.expressDelivery.isBusy) {
          isBusy = true;
        }
        status = isBusy ? 'BUSY' : (isAcceptingOrder ? 'ACCEPTING_ORDER' : 'NOT_ACCEPTING_ORDER');
      }
      if (status === 'NOT_ACCEPTING_ORDER') {
        const busyCase = await context.brandLocationAvailability.getActiveAvailabilityByBrandLocationId(root.id);
        if (busyCase.length > 0) status = 'BUSY';
      }
      return status;
    },
    async icons(root, args, context) {
      const iconList = [];
      let availableFulfillments = [];
      if (root?.currentAvailableFulfillments) {
        availableFulfillments = root.currentAvailableFulfillments;
      } else {
        const fulfillmentsStatus = await context.brandLocation.getNewStoreFulfillmentStatusById(
          root.id
        );
        if (
          root.hasPickup &&
          (fulfillmentsStatus.pickup.storeStatus === brandLocationStoreStatus.STORE_OPEN ||
            fulfillmentsStatus.pickup.storeStatus ===
            brandLocationStoreStatus.STORE_CLOSING_SOON)
        ) {
          availableFulfillments.push(orderFulfillmentTypes.PICKUP);
        }
        if (
          root.hasDelivery &&
          (fulfillmentsStatus.delivery.storeStatus === brandLocationStoreStatus.STORE_OPEN ||
            fulfillmentsStatus.delivery.storeStatus ===
            brandLocationStoreStatus.STORE_CLOSING_SOON)
        ) {
          availableFulfillments.push(orderFulfillmentTypes.DELIVERY);
        }
        if (
          root.allowExpressDelivery &&
          (fulfillmentsStatus.expressDelivery.storeStatus ===
            brandLocationStoreStatus.STORE_OPEN ||
            fulfillmentsStatus.expressDelivery.storeStatus ===
            brandLocationStoreStatus.STORE_CLOSING_SOON)
        ) {
          availableFulfillments.push(orderFulfillmentTypes.EXPRESS_DELIVERY);
        }
        if (
          root.allowDeliverToCar &&
          (fulfillmentsStatus.pickup.storeStatus === brandLocationStoreStatus.STORE_OPEN ||
            fulfillmentsStatus.pickup.storeStatus ===
            brandLocationStoreStatus.STORE_CLOSING_SOON)
        ) {
          availableFulfillments.push(orderFulfillmentTypes.CAR);
        }
      }
      const fullAvailableFulfillmentTypes = await context.brandLocation.getAllAvailableFulfillmentTypes(root);
      fullAvailableFulfillmentTypes.forEach(fulFillmentType => {
        const fulfillmentIcon = fulFillmentIcons.find(icon => icon.type == fulFillmentType);
        if (fulfillmentIcon) {
          let url = '';
          let status = 2;
          if (availableFulfillments.includes(fulfillmentIcon.type)) {
            url = fulfillmentIcon.iconUrl;
            status = 1;
          } else {
            url = fulfillmentIcon.disableIconUrl;
            status = 2;
          }
          iconList.push({
            url,
            placement: iconPlacementEnum.FOOTER,
            status,
            sortOrder: fulfillmentIcon.sortOrder
          });
        }
      });
      const icons = iconList.sort((a, b) => a.sortOrder - b.sortOrder);
      return icons;
    },
    async labelTitle({ brand }) {
      const { name } = addLocalizationField(brand, 'name');
      return name;
    },
    async labelSubtitle({ distance, name }) {
      if (distance) {
        let distanceTextEn = distance + ' m';
        let distanceTextAr = distance + ' المسافة م';
        if (distance > 1000) {
          distanceTextEn = parseFloat(distance / 1000).toFixed(1) + ' km';
          distanceTextAr = parseFloat(distance / 1000).toFixed(1) + ' المسافة كم';
        }
        return {
          en: `${name.en} ${distanceTextEn}`,
          ar: `${name.ar} ${distanceTextAr}`,
          tr: `${name.tr} ${distanceTextEn}`,
        };
      } else {
        return {
          en: `${name.en}`,
          ar: `${name.ar}`,
          tr: `${name.tr}`,
        };
      }
    },
    async labelDescription({ brand }) {
      const { brandDescription } = addLocalizationField(brand, 'brandDescription');
      return brandDescription;
    },
  },
};
