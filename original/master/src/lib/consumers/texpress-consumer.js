const isUUID = require('is-uuid');
const { v4: UUIDv4 } = require('uuid');
const uuid = { get: UUIDv4, validate: isUUID.v4 };
const moment = require('moment');
const sqs = require('./../../lib/sqs-base')('from_talabat');

module.exports = function TexpressConsumer(queryContext) {
  const _consumer = async ({ payload }) => {

    console.info('Texpress Consumer > Payload >', payload);

    const { Body } = payload;

    try {

      const _deliveryStatuses = {
        NEW: 'CREATED',
        RECEIVED: 'ACCEPTED',
        COURIER_ACCEPTED_DELIVERY: 'ASSIGNED',
        NEAR_VENDOR: 'REACHED_MERCHANT',
        PICKED_UP: 'DISPATCHED',
        COURIER_LEFT_VENDOR: 'ON_WAY',
        NEAR_CUSTOMER: 'REACHED_CUSTOMER',
        DELIVERED: 'DELIVERED',
      };

      const skipTheseStatuses = ['WAITING_FOR_TRANSPORT', 'ASSIGNED_TO_TRANSPORT'];

      const _message = JSON.parse(Body);

      queryContext.kinesisLogger.sendLogEvent(_message, 'texpress-consumer');

      const {
        orderId,
        status,
        driver,
        type,
        texpress_order_id,
        timeline,
        tracking_link,
      } = _message;

      if (type === 'DELIVERY_OOB_REJECTION'
        || type === 'DELIVERY_REJECTION_EXCEPTION') {

        queryContext.kinesisLogger.sendLogEvent({ ..._message }, 'texpress-consumer');

        const { order } = _message;
        //Add Notes To Order Comments
        await queryContext.internalComment.save([{
          userName: 'Talabat Service',
          comment: _message.reason,
        }], order.orderId);
        //const { customer, dropoffLocation } = order;
        /*await queryContext.zendeskService.createTicketByToken({
          comment: `Talabat Service Message: ${_message.reason}
            Order Code : ${order.shortCode}
            Customer Phone : ${customer.phoneNumber}
            Address: ${dropoffLocation.line1}
            Exception Type: ${type}
          `,
          subject: `Talabat Service Exception - ${order.shortCode}`
        });*/
        return true;
      }

      let track_url = null;

      if (tracking_link) track_url = tracking_link;

      if (skipTheseStatuses.includes(status)) return true;

      if (type === 'DELIVERY_STATUS_UPDATE') {
        queryContext.kinesisLogger.sendLogEvent({ text: 'Starting status update', orderId }, 'texpress-consumer');

        const order = await queryContext.db('delivery_orders')
          .select('reference')
          .where('order_id', orderId)
          .first();

        const _status = _deliveryStatuses[status] || null;

        if (_status === null) throw new Error(`Unknown status [${status}] in texpress-consumer`);

        if (status === 'NEW') {
          queryContext.kinesisLogger.sendLogEvent({ status, orderId, texpress_order_id }, 'texpress-consumer');

          await queryContext.db('delivery_orders')
            .update({
              status: 'SUCCESS',
              estimated_time: timeline.estimated_delivery_time,
              partner_order_id: texpress_order_id,
              partner_reference_id: texpress_order_id
            })
            .where('order_id', orderId);

          await queryContext.orderFulfillment.assignCourierByOrderSetId(
            orderId,
            'TALABAT'
          );
        }

        const _data = {
          id: uuid.get(),
          created_at: moment()
            .format('YYYY-MM-DD HH:mm:ss'),
          updated_at: moment()
            .format('YYYY-MM-DD HH:mm:ss'),
          delivery_partner: 'TALABAT',
          event_created_at: moment()
            .format('YYYY-MM-DD HH:mm:ss'),
          reference: order.reference,
          partner_order_id: texpress_order_id,
          status: _status,
          track_url,
        };

        if (driver?.id) {
          _data['rider_id'] = driver.id;
          _data['rider_name'] = driver.name;
          _data['rider_contact_no'] = driver.phone_number;
        }

        queryContext.kinesisLogger.sendLogEvent({ text: 'Creating delivery_order_statuses entry', _status, orderId }, 'texpress-consumer');

        const dosEntry = await queryContext.db('delivery_order_statuses').insert(_data).returning('id');

        queryContext.kinesisLogger.sendLogEvent({ ...dosEntry, text: 'delivery_order_statuses entry created' }, 'texpress-consumer');
      }

    } catch (ex) {
      const exObj = ex?.message || ex?.stack;
      queryContext.kinesisLogger.sendLogEvent(exObj, 'texpress-consumer-exception');
    }
  };

  sqs.consume({ callback: _consumer });
};
