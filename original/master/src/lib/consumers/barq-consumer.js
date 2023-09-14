const isUUID = require('is-uuid');
const { v4: UUIDv4 } = require('uuid');
const uuid = { get: UUIDv4, validate: isUUID.v4 };
const moment = require('moment');
const sqs = require('../sqs-base')('from_barq');
module.exports = function BarqConsumer(queryContext) {
  const _consumer = async ({ payload }) => {
    console.info('Barq Consumer > Payload >', payload);
    const { Body } = payload;
    try {
      const _deliveryStatuses = {
        new_order: 'CREATED',
        processing: 'ACCEPTED',
        ready_for_delivery: 'ASSIGNED',
        picked_up: 'DISPATCHED',
        intransit: 'ON_WAY',
        completed: 'DELIVERED',
      };
      const skipTheseStatuses = [
        'cancelled',
        'exception',
        'returned',
        'damaged_or_lost',
        'not_ready_for_pickup',
        'pickup_failed',
        'processing_at_warehouse',
        'in_warehouse',
        'misrouted',
        'in_transit_to_warehouse'
      ];
      const _message = JSON.parse(Body);
      const {
        orderId,
        status,
        driver,
        type,
        delivery_order_id,
        //timeline,
        tracking_url,
      } = _message;
      if (type === 'DELIVERY_OOB_REJECTION'
        || type === 'DELIVERY_REJECTION_EXCEPTION') {
        const { order } = _message;
        //Add Notes To Order Comments
        await queryContext.internalComment.save([{
          userName: 'Barq Service',
          comment: _message.reason,
        }], order.orderId);
        //const { customer, dropoffLocation } = order;
        /*await queryContext.zendeskService.createTicketByToken({
          comment: `Barq Service Message: ${_message.reason}
            Order Code : ${order.shortCode}
            Customer Phone : ${customer.phoneNumber}
            Address: ${dropoffLocation.line1}
            Exception Type: ${type}
          `,
          subject: `Barq Service Exception - ${order.shortCode}`
        });*/
        return true;
      }
      let track_url = null;
      if (tracking_url) track_url = tracking_url;
      if (skipTheseStatuses.includes(status)) return true;
      if (type === 'DELIVERY_STATUS_UPDATE') {
        const order = await queryContext.db('delivery_orders')
          .select('reference')
          .where('order_id', orderId)
          .first();
        const _status = _deliveryStatuses[status] || null;
        if (_status === null) throw new Error(`Unknown status [${status}] in barq-consumer`);
        if (status === 'ready_for_delivery') {
          await queryContext.db('delivery_orders')
            .update({
              status: 'SUCCESS',
              //estimated_time: timeline.estimated_delivery_time,
              partner_order_id: delivery_order_id,
              partner_reference_id: delivery_order_id
            })
            .where('order_id', orderId);
          await queryContext.orderFulfillment.assignCourierByOrderSetId(
            orderId,
            'BARQ'
          );
        }
        const _data = {
          id: uuid.get(),
          created_at: moment()
            .format('YYYY-MM-DD HH:mm:ss'),
          updated_at: moment()
            .format('YYYY-MM-DD HH:mm:ss'),
          delivery_partner: 'BARQ',
          event_created_at: moment()
            .format('YYYY-MM-DD HH:mm:ss'),
          reference: order.reference,
          partner_order_id: delivery_order_id,
          status: _status,
          track_url,
        };
        if (driver?.id_number) {
          _data['rider_id'] = driver.id_number;
          _data['rider_name'] = driver.name;
          _data['rider_contact_no'] = driver.mobile;
        }
        await queryContext.db('delivery_order_statuses').insert(_data);
      }
    } catch (ex) {
      queryContext.kinesisLogger.sendLogEvent(ex, 'barq-consumer-exception');
    }
  };
  sqs.consume({ callback: _consumer });
};
