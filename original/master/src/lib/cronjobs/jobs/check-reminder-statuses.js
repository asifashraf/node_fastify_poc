const { addMinutes, differenceInDays, isAfter } = require('date-fns')
const axios = require('axios');
const { basePath, cSubscription } = require('../../../../config');
const OrderType = {
    ORDER_SET: 'ORDER_SET',
}
const ReminderType = {
    SUBSCRIPTION_LOW_CUP_COUNTS_REMINDER: 'SUBSCRIPTION_LOW_CUP_COUNTS_REMINDER',
    SUBSCRIPTION_ALL_CUPS_CONSUMED_FAST_REMINDER: 'SUBSCRIPTION_ALL_CUPS_CONSUMED_FAST_REMINDER',
    SUBSCRIPTION_ALL_CUPS_CONSUMED_REMINDER: 'SUBSCRIPTION_ALL_CUPS_CONSUMED_REMINDER',
    SUBSCRIPTION_EXPIRY_DATE_NEAR_REMINDER: 'SUBSCRIPTION_EXPIRY_DATE_NEAR_REMINDER',
    SUBSCRIPTION_EXPIRED_TODAY_REMINDER: 'SUBSCRIPTION_EXPIRED_TODAY_REMINDER',
    SUBSCRIPTION_EXPIRED_3_DAYS_LATER_REMINDER: 'SUBSCRIPTION_EXPIRED_3_DAYS_LATER_REMINDER',
    SUBSCRIPTION_EXPIRED_7_DAYS_LATER_REMINDER: 'SUBSCRIPTION_EXPIRED_7_DAYS_LATER_REMINDER',
    SUBSCRIPTION_EXPIRED_15_DAYS_LATER_REMINDER: 'SUBSCRIPTION_EXPIRED_15_DAYS_LATER_REMINDER',
    SUBSCRIPTION_EXPIRED_30_DAYS_LATER_REMINDER: 'SUBSCRIPTION_EXPIRED_30_DAYS_LATER_REMINDER',
    SUBSCRIPTION_AUTO_RENEWAL_REMINDER: 'SUBSCRIPTION_AUTO_RENEWAL_REMINDER',
};

module.exports = async function CheckReminderStatuses({orderType, referenceOrderId}, queryContext) {
    if (orderType !== OrderType.ORDER_SET) return;
    const db = queryContext.db;
    const orderSet = await db('order_sets').where('id', referenceOrderId).first();
    const subscriptionInfo = orderSet.prePaid?.subscription;
    if (!subscriptionInfo) return;
    const processes = [subscriptionInfo];
    for await (const {id: subscriptionId} of subscriptionInfo) {
        const subscriptionDetail = await db({sct: 'subscription_customer_transactions'})
            .select({
                subscriptionCustomerId: 'sct.subscription_customer_id',
                created: 'sct.created',
                remainingCups: 'sct.remaining_cups',
                remainingMinutes: 'sct.remaining_minutes',
                actionType: 'sct.action_type',
                subscriptionStatus: 's.status',
                subscriptionCustomerStatus: 'sc.status',
                autoRenewalStatus: 'scar.status',
                notifications: 'sc.notifications',
            })
            .leftJoin(
                {sc: 'subscription_customers'},
                'sc.id',
                'sct.subscription_customer_id'
            )
            .leftJoin(
                {s: 'subscriptions'},
                's.id',
                'sct.subscription_id'
            )
            .leftJoin(
                {scar: 'subscription_customer_auto_renewals'},
                'scar.id',
                'sc.subscription_customer_auto_renewal_id'
            )
            .where('sct.subscription_id', subscriptionId)
            .orderBy('sct.sequence', 'desc')
            .first();
        console.log(subscriptionDetail);
        const expiryDate = subscriptionDetail.actionType === 'FINISHED'
            ? new Date(subscriptionDetail.created)
            : addMinutes(new Date(subscriptionDetail.created), subscriptionDetail.remainingMinutes)

        if (checkLowCupCounts(subscriptionDetail, expiryDate)) {
            await axios.get(`${basePath}/c-subscription/reminder`, {
                headers: {'api-key': cSubscription.restEndpointsApiKey},
                params: {
                    subscriptionCustomerId: subscriptionDetail.subscriptionCustomerId,
                    type: ReminderType.SUBSCRIPTION_LOW_CUP_COUNTS_REMINDER,
                },
            });
            await db('subscription_customers')
                .where('id', subscriptionDetail.subscriptionCustomerId)
                .update({
                    notifications: {
                        ...subscriptionDetail.notifications,
                        isLowCupCountsSent: true,
                    }
                });
            processes.push({
                subscriptionCustomerId: subscriptionDetail.subscriptionCustomerId,
                type: ReminderType.SUBSCRIPTION_LOW_CUP_COUNTS_REMINDER,
            })
        }
        if (checkAllCupsConsumedFast(subscriptionDetail, expiryDate)) {
            await axios.get(`${basePath}/c-subscription/reminder`, {
                headers: {'api-key': cSubscription.restEndpointsApiKey},
                params: {
                    subscriptionCustomerId: subscriptionDetail.subscriptionCustomerId,
                    type: ReminderType.SUBSCRIPTION_ALL_CUPS_CONSUMED_FAST_REMINDER,
                },
            });
            await db('subscription_customers')
                .where('id', subscriptionDetail.subscriptionCustomerId)
                .update({
                    notifications: {
                        ...subscriptionDetail.notifications,
                        isAllCupsConsumedFastSent: true,
                    }
                });
            processes.push({
                subscriptionCustomerId: subscriptionDetail.subscriptionCustomerId,
                type: ReminderType.SUBSCRIPTION_ALL_CUPS_CONSUMED_FAST_REMINDER,
            })
        }
        if (checkAllCupsConsumed(subscriptionDetail, expiryDate)) {
            await axios.get(`${basePath}/c-subscription/reminder`, {
                headers: {'api-key': cSubscription.restEndpointsApiKey},
                params: {
                    subscriptionCustomerId: subscriptionDetail.subscriptionCustomerId,
                    type: ReminderType.SUBSCRIPTION_ALL_CUPS_CONSUMED_REMINDER,
                },
            });
            await db('subscription_customers')
                .where('id', subscriptionDetail.subscriptionCustomerId)
                .update({
                    notifications: {
                        ...subscriptionDetail.notifications,
                        isAllCupsConsumedSent: true,
                    }
                });
            processes.push({
                subscriptionCustomerId: subscriptionDetail.subscriptionCustomerId,
                type: ReminderType.SUBSCRIPTION_ALL_CUPS_CONSUMED_REMINDER,
            })
        }
    }
}

function checkLowCupCounts(subscriptionDetail, expiryDate) {
    const {
        subscriptionStatus, subscriptionCustomerStatus, autoRenewalStatus, remainingCups, notifications
    } = subscriptionDetail;
    return (
        subscriptionStatus === 'ACTIVE'
        && subscriptionCustomerStatus === 'ACTIVE'
        && autoRenewalStatus !== 'ACTIVE'
        && remainingCups > 0
        && remainingCups < 3
        && differenceInDays(expiryDate, new Date()) > 3
        && !notifications?.isLowCupCountsSent
    )
}

function checkAllCupsConsumedFast(subscriptionDetail, expiryDate) {
    const {
        subscriptionStatus, subscriptionCustomerStatus, autoRenewalStatus, remainingCups, notifications
    } = subscriptionDetail;
    const today = new Date();
    return (
        subscriptionStatus === 'ACTIVE'
        && subscriptionCustomerStatus === 'ACTIVE'
        && autoRenewalStatus === 'ACTIVE'
        && remainingCups === 0
        && isAfter(expiryDate, today)
        && differenceInDays(expiryDate, today) > 10
        && !notifications?.isAllCupsConsumedFastSent
    )
}

function checkAllCupsConsumed(subscriptionDetail, expiryDate) {
    const {
        subscriptionStatus, subscriptionCustomerStatus, autoRenewalStatus, remainingCups, notifications
    } = subscriptionDetail;
    const today = new Date();
    const diff = differenceInDays(expiryDate, today);
    return (
        subscriptionStatus === 'ACTIVE'
        && subscriptionCustomerStatus === 'ACTIVE'
        && autoRenewalStatus === 'ACTIVE'
        && remainingCups === 0
        && isAfter(expiryDate, today)
        && diff < 11
        && diff > 1
        && !notifications?.isAllCupsConsumedSent
    )
}
