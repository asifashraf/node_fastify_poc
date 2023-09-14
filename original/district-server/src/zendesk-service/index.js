const momenttz = require('moment-timezone');
const { snakeCase } = require('lodash');
const zendesk = require('node-zendesk');
const { orderFulfillmentTypes } = require('../schema/order-set/enums');
const {
  kinesisEventTypes: { zendeskTicketCreate, zendeskTicketError },
} = require('../lib/aws-kinesis-logging');
const { zendeskService: zendeskServiceConfig } = require('../../config');

class ZendeskService {
  constructor(db, context) {
    this.db = db;
    this.context = context;
    this.client = zendesk.createClient(zendeskServiceConfig);
    // check these ids from
    // https://cofeapp.zendesk.com/admin/objects-rules/tickets/ticket-fields
    this.customFieldIds = {
      id: 360007366138,
      placedTime: 360009044818,
      status: 360011268137, // should be lowercase
      updatedTime: 360010649057,
      country: 360011247578, // should be snake-case
      brand: 360011271758,
      branch: 360011295397,
      fulfillment: 360010638517, // should be lowercase
      srcPlatform: 360011247878, // should be lowercase
      srcPlatformVersion: 360011247898,
      customerName: 360009096618, // first and last name
      customerPhoneNumber: 360007366158,
      customerEmail: 360011268737,
      paymentMethod: 360011268897, // should be lowercase
      total: 360011268917
    };
    this.baseTicket = {
      subject: 'Cofe Admin Platform Ticket',
      comment: {
        body: 'This ticket is created from Cofe admin platform'
      }
    };
  }

  mapOrderToCustomFields(order) {
    return [
      {id: this.customFieldIds.id, value: order.id},
      {id: this.customFieldIds.placedTime, value: order.placedTime},
      {
        id: this.customFieldIds.status,
        value: this.getFromOrderStatus(order.status).toLowerCase()
      },
      {id: this.customFieldIds.updatedTime, value: order.updatedTime},
      {id: this.customFieldIds.country, value: snakeCase(order.country.name)},
      {id: this.customFieldIds.brand, value: order.brand},
      {id: this.customFieldIds.branch, value: order.branch},
      {
        id: this.customFieldIds.fulfillment,
        value: order.fulfillment.toLowerCase()
      },
      {
        id: this.customFieldIds.srcPlatform,
        value: order.srcPlatform.toLowerCase()
      },
      {
        id: this.customFieldIds.srcPlatformVersion,
        value: order.srcPlatformVersion
      },
      {
        id: this.customFieldIds.customerName,
        value: `${order.customer.firstName} ${order.customer.lastName}`
      },
      {
        id: this.customFieldIds.customerPhoneNumber,
        value: order.customer.phoneNumber
      },
      {id: this.customFieldIds.customerEmail, value: order.customer.email},
      {
        id: this.customFieldIds.paymentMethod,
        value: order.paymentMethod.toLowerCase()
      },
      {id: this.customFieldIds.total, value: order.total},
    ];
  }

  getFromOrderStatus(orderStatus) {
    switch (orderStatus) {
      case 'PREPARING':
      case 'PREPARED':
      case 'WAITING_FOR_COURIER':
      case 'OUT_FOR_DELIVERY':
      case 'READY_FOR_PICKUP':
      case 'DELIVERED':
        return 'ACCEPTED';
      case 'INITIATED':
        return 'PLACED';
      default:
        return orderStatus;
    }
  }

  async sendZendeskMessage(ticketContent) {
    const ticket = {
      ...this.baseTicket,
      requester: {
        email: ticketContent.requesterEmail
      },
      custom_fields: this.mapOrderToCustomFields(ticketContent)
    };

    const result = await this.client.tickets.create({ ticket });
    return result.id;
  }

  async createZendeskTicket(orderId, requesterEmail) {
    let orderSet;
    try {
      const query = `email:${requesterEmail}`;
      const [user] = await this.client.users.search({ query });

      if (!user) {
        throw new Error('Requester user does not exists on Zendesk platform.');
      }

      orderSet = await this.context.orderSet.getById(orderId);
      if (!orderSet) {
        return {
          success: false,
          message: 'Order not found',
          error: 'Invalid order id',
        };
      }

      const orderRating = await this.context.orderRating.getOrderRatingByOrderSetId(
        orderId
      );
      let isBadReview = false;
      if (orderRating) {
        isBadReview = orderRating.rating < 3;
      }
      const latestStatus = await this.context.orderSetStatus.getLatestByOrderSet(
        orderId
      );
      const orderFulfillment = await this.context.orderFulfillment.getByOrderSet(
        orderId
      );
      const {
        firstName,
        lastName,
        email,
        phoneNumber,
      } = await this.context.customer.getById(orderSet.customerId);
      const brandLocation = await this.context.brandLocation.getById(
        orderSet.brandLocationId
      );
      const brand =
        brandLocation &&
        brandLocation.brandId &&
        (await this.context.brand.getById(brandLocation.brandId));
      const country =
        brandLocation &&
        brandLocation.cityId &&
        (await this.context.country.getByCityId(brandLocation.cityId));

      const order = {
        id: orderSet.shortCode,
        placedTime: momenttz
          .utc(orderSet.createdAt)
          .tz(country.timeZoneIdentifier)
          .format('hh:mm A'), // "12:28 PM",
        status: latestStatus && latestStatus.status,
        updatedTime:
          latestStatus &&
          momenttz
            .utc(latestStatus.createdAt)
            .tz(country.timeZoneIdentifier)
            .format('hh:mm A'), // "12:28 PM",
        country: country && {
          name: country.name.en,
          isoCode: country.isoCode,
        },
        brand: brand && brand.name,
        branch: brandLocation && brandLocation.name,
        fulfillment:
          orderFulfillment &&
          orderFulfillment.type === orderFulfillmentTypes.PICKUP
            ? orderFulfillmentTypes.PICKUP
            : orderFulfillmentTypes.DELIVERY, // ["PICKUP", "DELIVERY"],
        srcPlatform: orderSet.srcPlatform || '', // ['ios', 'android']
        srcPlatformVersion: orderSet.srcPlatformVersion || '',
        customer: {
          firstName,
          lastName,
          phoneNumber,
          email,
        },
        paymentMethod: orderSet.paymentMethod,
        total: orderSet.total,
        requesterEmail,
        isBadReview,
      };

      // Zendesk Service Returns Ticket Id in the response
      const createdTicketId = await this.sendZendeskMessage(order);
      console.log('createdTicketId', createdTicketId);

      await this.context.kinesisLogger.sendLogEvent(order, zendeskTicketCreate);

      return {
        success: true,
        message: 'Zendesk ticket sent for creation',
        ticketId: createdTicketId,
      };
    } catch (err) {
      console.log('Error createZendeskTicket -> ', err);
      const { stack, message } = err || {};
      this.context.kinesisLogger.sendLogEvent({ err, stack, message }, zendeskTicketError);
      return {
        success: false,
        message: 'Error creating zendesk ticket',
        error: err.message,
      };
    }
  }
}

module.exports = ZendeskService;
