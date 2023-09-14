const axios = require("axios");
const { basePath, cSubscription } = require('../../../../config');
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

module.exports = async function checkSubscriptionsExpired15DaysLaterReminderStatus(queryContext) {
    const db = queryContext.db;
    const {rows: finishedSubscriptionCustomerTransactions} = await db.raw(`
        select sct.subscription_customer_id,
               sct.subscription_id,
               sct.customer_id,
               sct.action_type,
               sct.remaining_minutes,
               sct.remaining_cups,
               sct.created,
               s.status subscription_status,
               sc.status,
               scar.status auto_renewal_status,
               date_trunc('day', sct.created + (21600 * interval '1 minute')) reminder_date,
               date_trunc('day', current_timestamp)
        from subscription_customer_transactions sct
                 left join subscription_customers sc on
            sc.id = sct.subscription_customer_id
                 left join subscription_customer_auto_renewals scar on
            sc.subscription_customer_auto_renewal_id = scar.id
                 left join subscriptions s on
            s.id = sct.subscription_id
        where sct.action_type = 'FINISHED'
          and s.status = 'ACTIVE'
          and scar.status <> 'ACTIVE'
          and date_trunc('day'
                  , sct.created + (21600 * interval '1 minute')) = date_trunc('day'
                  , current_timestamp)
    `)
    const customerIds = finishedSubscriptionCustomerTransactions.map(
        subscriptionCustomerTransaction => subscriptionCustomerTransaction['customer_id']
    )
    const activeSubscriptionCustomers = await db('subscription_customers')
        .whereIn('customer_id', customerIds)
        .andWhere('status', 'ACTIVE')
    const results = finishedSubscriptionCustomerTransactions.reduce(
        (results, subscriptionCustomerTransaction) => {
            const index = activeSubscriptionCustomers.findIndex(
                subscriptionCustomer =>
                    subscriptionCustomer.customerId === subscriptionCustomerTransaction['customer_id']
                    && subscriptionCustomer.subscriptionId === subscriptionCustomerTransaction['subscription_id']
            )
            if (index === -1) {
                results.push(subscriptionCustomerTransaction['subscription_customer_id'])
            }
            return results;
        },
        []
    )
    if (results?.length > 0) {
        await Promise.all(results.map((subscriptionCustomerId) => {
            return axios.get(`${basePath}/c-subscription/reminder`, {
                headers: {'api-key': cSubscription.restEndpointsApiKey},
                params: {
                    subscriptionCustomerId,
                    type: ReminderType.SUBSCRIPTION_EXPIRED_15_DAYS_LATER_REMINDER,
                },
            });
        }));
    }
}
