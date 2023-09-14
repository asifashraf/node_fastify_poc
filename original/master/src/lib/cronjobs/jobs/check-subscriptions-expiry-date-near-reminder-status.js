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

module.exports = async function checkSubscriptionsExpiryDateNearReminderStatus(jobConfig, queryContext) {
    const db = queryContext.db;
    const results = await db.raw(`
        select distinct
        on
            (sct.subscription_customer_id) sct.subscription_customer_id,
            sct.action_type,
            sct.remaining_minutes,
            sct.created,
            scar.status auto_renewal_status,
            date_trunc('minute', sct.created + ((sct.remaining_minutes - ${jobConfig.expiryDateNearReminderBeforeFinishInMinutes}) * interval '1 minute')) reminder_date,
            date_trunc('minute', current_timestamp),
            sc.notifications
        from
            subscription_customer_transactions sct
        left join subscription_customers sc on
            sc.id = sct.subscription_customer_id
        left join subscription_customer_auto_renewals scar on
            sc.subscription_customer_auto_renewal_id = scar.id
        left join subscriptions s on
            s.id = sct.subscription_id
        where
          s.status = 'ACTIVE'
          and sc.status <> 'INACTIVE'
          and scar.status <> 'ACTIVE'
          and sc.notifications ->> 'isExpiryDateNearSent' is null
          and date_trunc('minute'
            , sct.created + ((sct.remaining_minutes - ${jobConfig.expiryDateNearReminderBeforeFinishInMinutes}) * interval '1 minute')) = date_trunc('minute'
            , current_timestamp)
        order by
            sct.subscription_customer_id,
            sct.created desc
    `)
    if (results?.rows.length > 0) {
        console.log({results: results?.rows});
        const responses = await Promise.all(results?.rows.map(async (row) => {
            await db('subscription_customers')
                .where('id', row['subscription_customer_id'])
                .update({
                    notifications: {
                        ...row.notifications,
                        isExpiryDateNearSent: true,
                    }
                });
            return axios.get(`${basePath}/c-subscription/reminder`, {
                headers: {'api-key': cSubscription.restEndpointsApiKey},
                params: {
                    subscriptionCustomerId: row['subscription_customer_id'],
                    type: ReminderType.SUBSCRIPTION_EXPIRY_DATE_NEAR_REMINDER,
                },
            });
        }));
        console.log({responses});
    }
}
