const moment = require('moment-timezone');
const { groupBy, find, filter, template } = require('lodash');

const generateCacheKey = (brandLocationId, fulfillment) => {
    return template(
        'fulfillmentAvailableNew:<%= brandLocationId %>:fulfillment:<%= fulfillment %>'
    )({ brandLocationId: brandLocationId, fulfillment: fulfillment });
}

module.exports = function BrandAvailabilityCacher(jobConfig, queryContext) {
    const fulfillmentTypes = [
        {
            name: "pickup",
            enableKey: "hasPickup",
            openAllDay: "pickupOpenAllDay",
            scheduleInfo: "pickupScheduleInfo",
            availabilityKey: "pickupEndTime",
        },
        {
            name: "car",
            enableKey: "allowDeliverToCar",
            openAllDay: "carOpenAllDay",
            scheduleInfo: "carScheduleInfo",
            availabilityKey: "carEndTime",
        },
        {
            name: "delivery",
            enableKey: "hasDelivery",
            openAllDay: "deliveryOpenAllDay",
            scheduleInfo: "deliveryScheduleInfo",
            availabilityKey: "deliveryEndTime",
        },
        {
            name: "expressDelivery",
            enableKey: "allowExpressDelivery",
            openAllDay: "expressDeliveryOpenAllDay",
            scheduleInfo: "expressDeliveryScheduleInfo",
            availabilityKey: "pickupEndTime",
        },
    ];

    const StoreStatusEnum = {
        STORE_OPEN: "STORE_OPEN",
        STORE_CLOSED: "STORE_CLOSED",
        STORE_CLOSING_SOON: "STORE_CLOSING_SOON",
    }

    const BRAND_LOCATION_TABLE_NAME = 'brand_locations';
    const WEEKLY_SCHEDULES_TABLE_NAME = 'brand_location_weekly_schedules';
    const SCHEDULE_EXCEPTIONS_TABLE_NAME = 'brand_location_schedule_exceptions';
    const AVAILABITIY_TABLE_NAME = 'brand_location_availabilities';
    const ACCEPTING_ORDER_TABLE_NAME = 'brand_location_accepting_orders';

    function generateStatusByFulfillment(brandLocation, acceptingOrders, weeklySchedules, scheduleExceptions, availabities, fulfillmentType) {
        let isAllDayClosed = true;
        let isBusy = false;
        let busyTime = null;
        const currentDate = moment().tz(brandLocation.timeZoneIdentifier);
        let operatingHours = [];
        const currentDayOfWeek = currentDate.day();
        const previousDayOfWeek = (currentDayOfWeek + 6) % 7;
        let acceptingTime = null;
        let acceptingStartTime = null;

        if (weeklySchedules) {
            const currentWeeklySchedule = find(weeklySchedules, weeklySchedule => weeklySchedule.day == currentDayOfWeek);
            const previousWeeklySchedule = find(weeklySchedules, weeklySchedule => weeklySchedule.day == previousDayOfWeek);
            if (currentWeeklySchedule && currentWeeklySchedule[fulfillmentType.openAllDay]) {
                operatingHours.push({
                    begin: currentDate.clone().startOf('day'),
                    end: currentDate.clone().add(1, 'days').startOf('day')
                })
            } else if (currentWeeklySchedule) {
                const scheduleInfo = currentWeeklySchedule[fulfillmentType.scheduleInfo];
                if (scheduleInfo && scheduleInfo.length > 0) {
                    scheduleInfo.map(schedule => {
                        const startingTime = schedule.openTime.split(':');
                        let openTime = currentDate.clone();
                        openTime.set({
                            hour: startingTime[0],
                            minute: startingTime[1],
                            second: startingTime[2],
                            millisecond: 0,
                        });
                        const closeTime = openTime.clone().add(schedule.openDuration, 'm');
                        if (currentDate.isBefore(closeTime)) {
                            operatingHours.push({
                                begin: openTime,
                                end: closeTime
                            })
                        }
                    })
                }
            }
            if (previousWeeklySchedule && !previousWeeklySchedule[fulfillmentType.openAllDay]) {
                const previousScheduleInfo = previousWeeklySchedule[fulfillmentType.scheduleInfo];
                if (previousScheduleInfo && previousScheduleInfo.length > 0) {
                    previousScheduleInfo.map(schedule => {
                        const startingTime = schedule.openTime.split(':');
                        let openTime = currentDate.clone();
                        openTime.set({
                            hour: startingTime[0],
                            minute: startingTime[1],
                            second: startingTime[2],
                            millisecond: 0,
                        });
                        openTime.subtract(1, 'd');
                        const closeTime = openTime.clone().add(schedule.openDuration, 'm');
                        if (openTime.isSameOrBefore(currentDate) && closeTime.isAfter(currentDate)) {
                            operatingHours.unshift({
                                begin: currentDate.clone().startOf('day'),
                                end: closeTime
                            })
                        }
                    })
                }
            }
        }

        if (scheduleExceptions) {
            const closeExceptions = filter(scheduleExceptions, scheduleException => scheduleException[fulfillmentType.name] && scheduleException.isClosed);
            const openExceptions = filter(scheduleExceptions, scheduleException => scheduleException[fulfillmentType.name] && !scheduleException.isClosed);
            if (closeExceptions.length > 0) {
                let exceptionTime = null;
                closeExceptions.map(closeException => {
                    const tempExceptionTime = moment(closeException.endTime);
                    if (!exceptionTime || exceptionTime.isBefore(tempExceptionTime)) exceptionTime = tempExceptionTime.clone();
                })
                let tempOperatingHours = [];
                operatingHours.map(operatingHour => {
                    if (exceptionTime.isBefore(operatingHour.end)) {
                        if (exceptionTime.isAfter(operatingHour.begin)) {
                            tempOperatingHours.push({
                                begin: exceptionTime,
                                end: operatingHour.closeTime
                            })
                        } else {
                            tempOperatingHours.push(operatingHour);
                        }
                    }
                })
                operatingHours = tempOperatingHours;
            } else if (openExceptions.length > 0) {
                let exceptionEndTime = null;
                let exceptionStartTime = currentDate.clone();
                openExceptions.map(openException => {
                    const tempExceptionTime = moment(openException.endTime);
                    if (!exceptionEndTime || exceptionEndTime.isBefore(tempExceptionTime)) {
                        exceptionEndTime = tempExceptionTime.clone();
                    }
                    exceptionStartTime = exceptionStartTime.isAfter(moment(openException.openTime)) ? moment(openException.openTime) : exceptionStartTime;
                })
                exceptionStartTime = exceptionStartTime.isBefore(currentDate.clone().startOf('day')) ? currentDate.clone().startOf('day') : exceptionStartTime;
                exceptionEndTime = exceptionEndTime.isAfter(currentDate.clone().add(1, 'days').startOf('day')) ? currentDate.clone().add(1, 'days').startOf('day') : exceptionEndTime;
                let tempOperatingHours = [];
                let exceptionTimeAdded = false;
                operatingHours.map(operatingHour => {
                    if (currentDate.isBefore(operatingHour.end)) {
                        if (exceptionEndTime.isBefore(operatingHour.begin)) {
                            if (!exceptionTimeAdded) {
                                tempOperatingHours.push({
                                    begin: exceptionStartTime,
                                    end: exceptionEndTime.clone(),
                                })
                            }
                            exceptionTimeAdded = true;
                            tempOperatingHours.push(operatingHour);
                        } else {
                            exceptionEndTime = exceptionEndTime.isBefore(operatingHour.end) ? operatingHour.end.clone() : exceptionEndTime;
                            exceptionStartTime = operatingHour.begin.isBefore(exceptionStartTime) ? operatingHour.begin.clone() : exceptionStartTime;
                        }
                    }
                })
                if (!exceptionTimeAdded) tempOperatingHours.unshift({
                    begin: exceptionStartTime,
                    end: exceptionEndTime
                })
                operatingHours = tempOperatingHours;
            }
        }

        if (availabities && operatingHours.length > 0) {
            availabities.map(availabity => {
                if (availabity[fulfillmentType.name]) {
                    isBusy = true;
                    const tempBusyTime = moment(availabity[fulfillmentType.availabilityKey])
                    if (!busyTime || busyTime.isBefore(tempBusyTime)) {
                        busyTime = tempBusyTime.clone();
                    }
                }
            })
            if (isBusy) {
                let tempOperatingHours = [];
                operatingHours.map(operatingHour => {
                    if (busyTime.isBefore(operatingHour.end)) {
                        if (busyTime.isAfter(operatingHour.begin)) {
                            tempOperatingHours.push({
                                begin: busyTime,
                                end: operatingHour.end
                            })
                        } else {
                            tempOperatingHours.push(operatingHour);
                        }
                    }
                })
                operatingHours = tempOperatingHours;
            }
        }

        if (acceptingOrders) {
            acceptingOrders.map(acceptingOrderTime => {
                if (acceptingOrderTime[fulfillmentType.name]) {
                    const tempAcceptingTime = moment(acceptingOrderTime[fulfillmentType.availabilityKey])
                    if (!acceptingTime || acceptingTime.isBefore(tempAcceptingTime)) {
                        acceptingTime = tempAcceptingTime.clone();
                        acceptingStartTime = moment(acceptingOrderTime.created)
                    }
                }
            })
            if (acceptingTime) {
                let tempOperatingHours = [];
                let acceptingTimeAdded = false
                operatingHours.map(operatingHour => {
                    if (acceptingTime.isBefore(operatingHour.begin)) {
                        if (!acceptingTimeAdded) {
                            tempOperatingHours.push({
                                begin: acceptingStartTime,
                                end: acceptingTime.clone(),
                            })
                            acceptingTimeAdded = true;
                        }
                        tempOperatingHours.push(operatingHour);
                    } else {
                        if (acceptingTime.isBefore(operatingHour.end)) {
                            tempOperatingHours.push({
                                begin: acceptingStartTime.isAfter(operatingHour.begin) ? operatingHour.begin : acceptingStartTime.clone(),
                                end: operatingHour.end
                            })
                            acceptingTimeAdded = true;
                        }
                    }
                })
                if (!acceptingTimeAdded) tempOperatingHours.unshift({
                    begin: acceptingStartTime.clone(),
                    end: acceptingTime.clone()
                })
                operatingHours = tempOperatingHours;
            }
        }

        const targetKey = generateCacheKey(brandLocation.id, fulfillmentType.name);

        isAllDayClosed = operatingHours.length == 0;
        let currentFulfilmentDetails = {
            storeStatus: StoreStatusEnum.STORE_CLOSED,
            isBusy,
            busyTime,
            isAllDayClosed,
            opening: operatingHours
        };

        operatingHours.map(operatingHour => {
            if (currentDate.isSameOrAfter(operatingHour.begin) && currentDate.isBefore(operatingHour.end)) {
                currentFulfilmentDetails.storeStatus = soonCheck(currentDate, operatingHour.end) ? StoreStatusEnum.STORE_CLOSING_SOON : StoreStatusEnum.STORE_OPEN;
            }
        })
        if (isAllDayClosed) {
            if (weeklySchedules) {
                const nextDayOfWeek = (currentDayOfWeek + 1) % 7;
                const { dayOfWeek, openTime } = findNextDayOpenTime(weeklySchedules, fulfillmentType, nextDayOfWeek, currentDayOfWeek, brandLocation);
                if (dayOfWeek > -1) {
                    currentFulfilmentDetails.openNextWeekDay = dayOfWeek;
                    currentFulfilmentDetails.openTimeNextWeekDay = openTime;
                } else currentFulfilmentDetails.allWeekClosed = true;
            } else {
                currentFulfilmentDetails.allWeekClosed = true;
            }
        } else {
            const lastOperatingTime = operatingHours.slice(-1)[0];
            if (lastOperatingTime && currentDate.isSameOrAfter(lastOperatingTime.begin) && currentDate.isBefore(lastOperatingTime.end) && moment(lastOperatingTime.end).isSameOrAfter(currentDate.clone().add(1, 'days').startOf('day'))) {
                const nextDayOfWeek = (currentDayOfWeek + 1) % 7;
                const { dayOfWeek, openTime, openDuration } = findNextDayOpenTime(weeklySchedules, fulfillmentType, nextDayOfWeek, currentDayOfWeek, brandLocation);
                if (dayOfWeek >= 0) {
                    const nextDayTime = currentDate.clone().add(1, 'days').startOf('day');
                    const nextDayStartingTime = openTime.split(':');
                    nextDayTime.set({
                        hour: nextDayStartingTime[0],
                        minute: nextDayStartingTime[1],
                        second: nextDayStartingTime[2],
                        millisecond: 0,
                    });
                    const nextDayCloseTime = nextDayTime.clone().add(openDuration, 'm');
                    if (nextDayOfWeek == dayOfWeek && moment(lastOperatingTime.end).isSameOrAfter(nextDayTime)) {
                        lastOperatingTime.end = nextDayCloseTime;
                        operatingHours[operatingHours.length - 1] = lastOperatingTime;
                        currentFulfilmentDetails.opening = operatingHours;
                        currentFulfilmentDetails.storeStatus = StoreStatusEnum.STORE_OPEN;
                    }
                }
            }
        }
        return (['set', targetKey, JSON.stringify(currentFulfilmentDetails), 'EX', jobConfig.redisTtl]);
    }

    function soonCheck(currentTime, closeTime) {
        const checkTime = closeTime.clone().subtract(jobConfig.closingSoonInMinutes, 'm');
        return checkTime.isSameOrBefore(currentTime);
    }

    function findNextDayOpenTime(weeklySchedules, fulfillmentType, checkDayOfWeek, currentDayOfWeek, brandLocation) {
        if (checkDayOfWeek == currentDayOfWeek) return { dayOfWeek: -1 };
        const checkWeeklySchedule = find(weeklySchedules, weeklySchedule => weeklySchedule.day == checkDayOfWeek);
        if (checkWeeklySchedule) {
            if (checkWeeklySchedule[fulfillmentType.openAllDay]) {
                return { openTime: '00:00:00', openDuration: 1440, dayOfWeek: checkDayOfWeek }
            } else {
                const scheduleInfo = checkWeeklySchedule[fulfillmentType.scheduleInfo];
                if (scheduleInfo && scheduleInfo.length > 0) {
                    return { openTime: scheduleInfo[0].openTime, openDuration: scheduleInfo[0].openDuration, dayOfWeek: checkDayOfWeek }
                }
            }
        }
        return findNextDayOpenTime(weeklySchedules, fulfillmentType, (checkDayOfWeek + 1) % 7, currentDayOfWeek, brandLocation)
    }

    return async function () {
        console.info(`BranchAvailabilityCacher is running....`);
        try {
            const { db } = queryContext;

            const brandLocationList = await db(`${BRAND_LOCATION_TABLE_NAME} as bl`)
                .select(db.raw(`
              bl.id,
              bl.name as brand_location_name,
              bl.time_zone_identifier,
              bl.accepting_orders,
              bl.has_pickup,
              bl.has_delivery,
              bl.allow_deliver_to_car,
              bl.allow_express_delivery`))
                .leftJoin('brands as b', 'b.id', `bl.brand_id`)
                .where('bl.status', 'ACTIVE')
                .andWhere('b.status', 'ACTIVE')
                .andWhere('bl.accepting_orders', true);

            const brandLocationIds = brandLocationList.map(brandLocation => brandLocation.id);
            const weeklySchedules = await db(`${WEEKLY_SCHEDULES_TABLE_NAME} as blws`)
                .select('blws.*')
                .leftJoin('brand_locations as bl', 'bl.id', `blws.brand_location_id`)
                .whereIn('blws.brand_location_id', brandLocationIds)
                .orderBy('blws.day', 'desc');

            const groupedWeeklySchedules = groupBy(weeklySchedules, "brandLocationId")

            const scheduleExceptions = await db(SCHEDULE_EXCEPTIONS_TABLE_NAME)
                .whereIn('brand_location_id', brandLocationIds)
                .andWhere('status', true)
                .andWhereRaw(`start_time <= NOW() and NOW() < end_time`)
                .orderBy('created', 'asc');
            const groupedScheduleExceptions = groupBy(scheduleExceptions, "brandLocationId");

            const availabities = await db(AVAILABITIY_TABLE_NAME)
                .whereIn('brand_location_id', brandLocationIds)
                .andWhere('status', true)
                .andWhereRaw(`
                ((pickup = true and NOW() < pickup_end_time) or 
                (car = true and NOW() < car_end_time) or
                (delivery = true and NOW() < delivery_end_time) or
                (express_delivery = true and NOW() < express_delivery_end_time))
              `);
            const groupedAvailabities = groupBy(availabities, "brandLocationId");

            const acceptingOrders = await db(ACCEPTING_ORDER_TABLE_NAME)
                .whereIn('brand_location_id', brandLocationIds)
                .andWhere('status', true)
                .andWhereRaw(`
              ((pickup = true and NOW() < pickup_end_time) or 
              (car = true and NOW() < car_end_time) or
              (delivery = true and NOW() < delivery_end_time) or
              (express_delivery = true and NOW() < express_delivery_end_time))
            `);
            const groupedAcceptingOrders = groupBy(acceptingOrders, "brandLocationId");

            const setCommands = [];

            brandLocationList.map(brandLocation => {
                const acceptingOrders = groupedAcceptingOrders[brandLocation.id];
                const weeklySchedules = groupedWeeklySchedules[brandLocation.id]; //find(groupedWeeklySchedules, weeklySchedule => weeklySchedule.brandLocationId == brandLocation.id);
                const scheduleExceptions = groupedScheduleExceptions[brandLocation.id];
                const availabities = groupedAvailabities[brandLocation.id];
                fulfillmentTypes.map(fulfillmentType => {
                    const response = generateStatusByFulfillment(brandLocation, acceptingOrders, weeklySchedules, scheduleExceptions, availabities, fulfillmentType, acceptingOrders);
                    setCommands.push(response);
                })
            });

            await queryContext.redis
                .multi(setCommands)
                .exec(function (err) {
                    if (err) {
                        console.error('BranchAvailabilityCacher > Caching Exception > ', err.toString());
                    } else console.info(`BranchAvailabilityCacher > Caching Success`);
                });
        } catch (ex) {
            console.error(`BranchAvailabilityCacher > exception >`, ex);
        }

        console.info(`BranchAvailabilityCacher is running....`);
    }
}
