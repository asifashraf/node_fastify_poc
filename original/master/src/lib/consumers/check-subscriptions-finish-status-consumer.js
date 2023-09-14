const sqs = require('./../../lib/sqs-base')('cSubscription');

module.exports = function CheckSubscriptionsFinishStatusConsumer(queryContext) {
  const sqsConsumer = async ({ payload }) => {
    try {
        const results = await queryContext.db.raw(`
            select distinct
            on
                (sct.subscription_customer_id) sct.subscription_customer_id,
                sct.action_type,
                sct.remaining_minutes,
                sct.created,
                sct.created + (sct.remaining_minutes * interval '1 minute') finish_date,
                current_timestamp
            from
                subscription_customer_transactions sct
                left join subscription_customers sc
            on
                sc.id = sct.subscription_customer_id
            where
                sc.status <> 'INACTIVE'
              and sct.created + (sct.remaining_minutes * interval '1 minute') <= current_timestamp
            order by
                sct.subscription_customer_id,
                sct.created desc
        `)
        if (results?.rows.length > 0) {
            console.log({results: results?.rows});
            await sqs.sendMessage(results.rows.map(row => ({
                DelaySeconds: 0,
                Id: row['subscription_customer_id'],
                MessageBody: JSON.stringify({
                    finishType: 'RUN_OUT_TIME',
                    subscriptionCustomerId: row['subscription_customer_id'],
                }),
            })), 0)
        }
    } catch (ex) {
      const { stack, message } = ex || {};
      queryContext.kinesisLogger.sendLogEvent(
        { stack, message },
        'check-subscriptions-finish-status-consumer-exception'
      );
    }
  };
  sqs.consume({ callback: sqsConsumer });
};
