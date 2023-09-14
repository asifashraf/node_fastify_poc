const axios = require("axios");

const generateCacheKey = (brandLocationId, fulfillment) => {
    return template(
        'fulfillmentAvailableNew:<%= brandLocationId %>:fulfillment:<%= fulfillment %>'
    )({ brandLocationId: brandLocationId, fulfillment: fulfillment });
}

module.exports = function BranchOpenedNotification(jobConfig, queryContext) {
    const fulfillmentTypes = ["pickup", "car", "delivery", "expressDelivery"];

    const StoreStatusEnum = {
        STORE_OPEN: "STORE_OPEN",
        STORE_CLOSED: "STORE_CLOSED",
        STORE_CLOSING_SOON: "STORE_CLOSING_SOON",
    }

    const CUSTOMER_NOTIFICATION_REQUEST_TABLE_NAME = 'customer_notification_request';

    return async function () {
        console.info(`BranchOpenedNotification is running....`);
        try {
            const { db, redis } = queryContext;

            const brandLocationIds = await db(CUSTOMER_NOTIFICATION_REQUEST_TABLE_NAME)
                .select(db.raw(`brand_location_id`))
                .where('status', true)
                .groupBy('brand_location_id');

            if (brandLocationIds.length > 0) {
                const fulfillmentCacheKeys = [];
                brandLocationIds.map(obj => {
                    fulfillmentTypes.map(fulfillmentType => {
                        fulfillmentCacheKeys.push(generateCacheKey(obj.brandLocationId, fulfillmentType));
                    })
                })
                const parsedStoreDataList = await redis.mget(fulfillmentCacheKeys);
                let requestedBrandLocationIds = [];

                for (const index in brandLocationIds) {
                    const brandLocationId = brandLocationIds[index].brandLocationId;
                    for (let i = 0; i < fulfillmentTypes.length; i++) {
                        const storeStatusByFulfillment = JSON.parse(
                            parsedStoreDataList[fulfillmentTypes.length * index + i]
                        ) || {
                            storeStatus: StoreStatusEnum.STORE_CLOSED
                        };
                        if (storeStatusByFulfillment.storeStatus === StoreStatusEnum.STORE_OPEN || storeStatusByFulfillment.storeStatus === StoreStatusEnum.STORE_CLOSING_SOON) {
                            requestedBrandLocationIds.push(brandLocationId);
                            break;
                        }
                    }
                }

                if (requestedBrandLocationIds.length > 0) {
                    const response = await axios.post(`${jobConfig.baseUrl}/branch-availability/customer-notification-sender`,
                        { brandLocationIds: requestedBrandLocationIds },
                        {
                            headers: { 'api-key': jobConfig.apiKey },
                        });
                    if (!response.status) {
                        console.error(`requestedBrandLocationIds > response >`, response);
                    }
                } else {
                    console.info('BranchOpenedNotification > There is no opened shop for requests...');
                }
            }
        } catch (ex) {
            console.error(`BranchOpenedNotification > exception >`, ex);
        }
        console.info(`BranchOpenedNotification is finished....`);
    }
}
