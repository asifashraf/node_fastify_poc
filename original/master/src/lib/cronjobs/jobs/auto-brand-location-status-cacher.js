const { transformToCamelCase } = require('../../util');
const momentTimezoneAccessor = require('moment-timezone');

module.exports = function BranchStatusCacher(jobConfig, queryContext) {
    const AUTO_BRAND_LOCATION_STATUS_CACHE_TTL_SECONDS = jobConfig.redisTtl;

    const StoreStatusEnum = {
        STORE_OPEN: "STORE_OPEN",
        STORE_CLOSED: "STORE_CLOSED",
        STORE_CLOSING_SOON: "STORE_CLOSING_SOON",
    }

    const fulfillmentTypes = [
        {
            fulfillmentType: "pickup",
            enableKey: "hasPickup",
            openingTimeKey: "openTime",
            openingDurationKey: "openDuration",
            preOpeningTimeKey: "preOpenTime",
            preOpeningDurationKey: "preOpenDuration",
            exceptionKey: "isClosed"
        },
        {
            fulfillmentType: "delivery",
            enableKey: "hasDelivery",
            openingTimeKey: "deliveryOpenTime",
            openingDurationKey: "deliveryOpenDuration",
            preOpeningTimeKey: "preDeliveryOpenTime",
            preOpeningDurationKey: "preDeliveryOpenDuration",
            exceptionKey: "isDeliveryClosed"
        },
        {
            fulfillmentType: "expressDelivery",
            enableKey: "allowExpressDelivery",
            openingTimeKey: "expressDeliveryOpenTime",
            openingDurationKey: "expressDeliveryOpenDuration",
            preOpeningTimeKey: "preExpressDeliveryOpenTime",
            preOpeningDurationKey: "preExpressDeliveryOpenDuration",
            exceptionKey: "isExpressDeliveryClosed"
        },
    ]

    const blQuery = `select bl.*, ws.open_all_day, ws.open_time, ws.open_duration, ws.delivery_open_time, ws.delivery_open_duration, ws.express_delivery_open_time, ws.express_delivery_open_duration, se.is_closed, se.is_delivery_closed, se.is_express_delivery_closed, se.start_time, se.end_time,
    wsp.open_all_day as pre_open_all_day, wsp.open_time as pre_open_time, wsp.open_duration as pre_open_duration , wsp.delivery_open_time as pre_delivery_open_time, wsp.delivery_open_duration as pre_delivery_open_duration, wsp.express_delivery_open_time as pre_express_delivery_open_time, wsp.express_delivery_open_duration as pre_express_delivery_open_duration, ws.day, wsp.day as pre_day
    from (
    SELECT id as brand_location_id , "name" as brand_location_name, time_zone_identifier, accepting_orders , has_pickup , has_delivery , allow_express_delivery from brand_locations where accepting_orders = true
    ) as bl
    left JOIN weekly_schedules ws on ws.brand_location_id = bl.brand_location_id and ws.day = ((EXTRACT(DOW from NOW() AT TIME ZONE bl.time_zone_identifier )) + 1 )
    left JOIN weekly_schedules as wsp on wsp.brand_location_id = bl.brand_location_id and wsp.day = (CASE WHEN (EXTRACT(DOW from NOW() AT TIME ZONE bl.time_zone_identifier ))=0 THEN 7
                ELSE (EXTRACT(DOW from NOW() AT TIME ZONE bl.time_zone_identifier ))
           END  )
    left join schedule_exceptions se on se.brand_location_id = ws.brand_location_id and se.start_time < NOW() and NOW() < se.end_time        
    where ws.brand_location_id = bl.brand_location_id`;

    function generateBrandLocationStatus(brandLocationData) {
        const closingSoonTimeDifferenceMs = 15 * 60 * 1000;

        const resultData = {};
        for (let i = 0; i < fulfillmentTypes.length; i++) {
            const currentFulfillmentDetails = fulfillmentTypes[i];
            // Check if branch is accepting orders
            if (!brandLocationData.acceptingOrders) {
                resultData[currentFulfillmentDetails.fulfillmentType] = { storeStatus: StoreStatusEnum.STORE_CLOSED }
                continue;
            }
            // Check if branch allows accepting such fulfilment
            if (!brandLocationData[currentFulfillmentDetails.enableKey]) {
                resultData[currentFulfillmentDetails.fulfillmentType] = { storeStatus: StoreStatusEnum.STORE_CLOSED }
                continue;
            }
            // As the resolution of cronjob is only 1 minute, we directly get if we are in an exception window, if we are , just return as closed
            if (brandLocationData[currentFulfillmentDetails.exceptionKey]) {
                resultData[currentFulfillmentDetails.fulfillmentType] = { storeStatus: StoreStatusEnum.STORE_CLOSED }
                continue;
            }
            // After all the checks, we are free to check the schedules
            const currentDate = momentTimezoneAccessor(new Date())
                //@ts-ignore
                .tz(brandLocationData.timeZoneIdentifier);
            if (brandLocationData.openAllDay) {
                const closeDate = currentDate.clone().add(1, 'days');
                resultData[currentFulfillmentDetails.fulfillmentType] = {
                    storeStatus: StoreStatusEnum.STORE_OPEN,
                    opening: {
                        begin: currentDate,
                        end: closeDate
                    }
                }
                continue;
            }
            // The brand location must be available for given fulfillment in a given operation window
            else {
                // This is a problem with database constraints , allowDelivery can be true, but delivery start / duration can be null
                const ignoreCurrent = !(brandLocationData[currentFulfillmentDetails.openingTimeKey] && brandLocationData[currentFulfillmentDetails.openingDurationKey]);
                const ignorePre = !(brandLocationData[currentFulfillmentDetails.preOpeningTimeKey] && brandLocationData[currentFulfillmentDetails.preOpeningDurationKey]);
                if (ignoreCurrent && ignorePre) {
                    resultData[currentFulfillmentDetails.fulfillmentType] = { storeStatus: StoreStatusEnum.STORE_CLOSED }
                    continue;
                }

                let openDate = null;
                let closeDate = null;
                if (!ignoreCurrent) {
                    const startingTime = brandLocationData[currentFulfillmentDetails.openingTimeKey].split(':');
                    const openDuration = brandLocationData[currentFulfillmentDetails.openingDurationKey];
                    openDate = currentDate.clone();
                    openDate.set({
                        hour: startingTime[0],
                        minute: startingTime[1],
                        second: startingTime[2],
                        millisecond: 0,
                    });
                    closeDate = openDate.clone();
                    closeDate.add(openDuration, 'minute');
                }
                let preOpenDate = null;
                let preCloseDate = null;
                if (!ignorePre) {
                    const preStartingTime = brandLocationData[currentFulfillmentDetails.preOpeningTimeKey].split(':');
                    const preOpenDuration = brandLocationData[currentFulfillmentDetails.preOpeningDurationKey];
                    preOpenDate = currentDate.clone().subtract(1, 'days');
                    preOpenDate.set({
                        hour: preStartingTime[0],
                        minute: preStartingTime[1],
                        second: preStartingTime[2],
                        millisecond: 0,
                    });
                    preCloseDate = preOpenDate.clone();
                    preCloseDate.add(preOpenDuration, 'minute');
                }

                let storeStatus = StoreStatusEnum.STORE_OPEN;
                if (!ignoreCurrent) {
                    if (currentDate.valueOf() > closeDate.valueOf()) {
                        resultData[currentFulfillmentDetails.fulfillmentType] = { storeStatus: StoreStatusEnum.STORE_CLOSED };
                        continue;
                    } else if (currentDate.valueOf() < openDate.valueOf() && !ignorePre) {
                        if (currentDate.valueOf() > preCloseDate.valueOf() || currentDate.valueOf() < preOpenDate.valueOf()) {
                            resultData[currentFulfillmentDetails.fulfillmentType] = { storeStatus: StoreStatusEnum.STORE_CLOSED };
                            continue;
                        } else if (currentDate.valueOf() + closingSoonTimeDifferenceMs > preCloseDate.valueOf()) {
                            storeStatus = StoreStatusEnum.STORE_CLOSING_SOON;
                        }
                        resultData[currentFulfillmentDetails.fulfillmentType] = {
                            storeStatus: storeStatus,
                            opening: {
                                begin: preOpenDate,
                                end: preCloseDate
                            }
                        }
                        continue;
                    } else {
                        resultData[currentFulfillmentDetails.fulfillmentType] = {
                            storeStatus: storeStatus,
                            opening: {
                                begin: openDate,
                                end: closeDate
                            }
                        }
                        continue;
                    }
                } else {
                    if (currentDate.valueOf() > preCloseDate.valueOf() || currentDate.valueOf() < preOpenDate.valueOf()) {
                        resultData[currentFulfillmentDetails.fulfillmentType] = { storeStatus: StoreStatusEnum.STORE_CLOSED };
                        continue;
                    } else if (currentDate.valueOf() + closingSoonTimeDifferenceMs > preCloseDate.valueOf()) {
                        storeStatus = StoreStatusEnum.STORE_CLOSING_SOON;
                    }
                    resultData[currentFulfillmentDetails.fulfillmentType] = {
                        storeStatus: storeStatus,
                        opening: {
                            begin: preOpenDate,
                            end: preCloseDate
                        }
                    }
                    continue;
                }

            }
        }
        return resultData;
    }

    function generateCacheKey(brandLocationId, fulfillment) {
        return `fulfilmentAvailable:${brandLocationId}:fulfilment:${fulfillment}`;
    }

    return async function () {
        console.info(`AutoBrandLocationStatusCacher is running....`);

        let dataResults = await queryContext.db.raw(blQuery);

        dataResults = transformToCamelCase(dataResults.rows);

        const results = dataResults;

        const processedData = dataResults.map(e => {
            return generateBrandLocationStatus(e);
        });

        let setCommands = [];

        for (let i = 0; i < processedData.length; i++) {
            const rawData = results[i];
            const currentData = processedData[i]
            for (let j = 0; j < fulfillmentTypes.length; j++) {
                const currentFulfilment = fulfillmentTypes[j];
                const targetKey = generateCacheKey(rawData.brandLocationId, currentFulfilment.fulfillmentType);
                const currentFulfilmentDetails = currentData[currentFulfilment.fulfillmentType];
                setCommands.push(['set', targetKey, JSON.stringify(currentFulfilmentDetails), 'EX', AUTO_BRAND_LOCATION_STATUS_CACHE_TTL_SECONDS]);
            }
        }

        await queryContext.redis
            .multi(setCommands)
            .exec(function (err) {
                if (err) {
                    console.error('Caching error: ', err.toString());
                } else console.log('Branch status caching process success');
            });

        console.info(`AutoBrandLocationStatusCacher is finishing....`);
    }

}