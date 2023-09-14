/* eslint-disable camelcase */
/* eslint-disable complexity */
const { first, get, pick, find, filter, omit, groupBy, sumBy, map, isArray } = require('lodash');
const moment = require('moment');
const Promise = require('bluebird');
const BaseModel = require('../../base-model');
const KD = require('../../lib/currency');
const {
  transformToCamelCase,
  formatErrorResponse,
  formatError,
  orderSetPaymentMethod,
  addLocalizationField,
  publishSubscriptionEvent,
  toDateWithTZ,
  jsonToObject,
  uuid,
  fileLog,
} = require('../../lib/util');
const {
  delivery: { deliveryServiceUrl },
  notifications: {
    emailAddresses: { receipts },
  },
  timezone,
} = require('../../../config');
const {
  // customerAddressType,
  transactionAction,
  transactionType,
  loyaltyTransactionType,
  couponDetailUsedOn,
  invoiceComponentType,
  couponType,
  orderSetError,
  orderSetStatusNames,
  orderQueueSetStatusName,
  paymentStatusName,
  paymentStatusOrderType,
  orderPaymentMethods,
  rewardTierPerkType,
  orderSetSubscriptionEvent,
  promoType,
  fulfillmentType: fulfillmentTypeEnum,
  deliveryPartners,
} = require('../root/enums');
const { orderFulfillmentTypes, orderCreateError } = require('./enums');
const { notificationCategories } = require('../../lib/notifications');
const { renderConfirmationEmail } = require('./email-confirmation-renderer');
const ReportFormatter = require('./report-formatter');
const OrderReportFormatter = require('./orders-report-formatter');
const NewOrderReportFormatter = require('./new-orders-report-formatter');
const FinancialReportFormatter = require('./financial-report-formatter');
const validateOrder = require('./utils/validate-order');
const { createOrder } = require('./utils/create-order');
const { computeInvoice } = require('./utils/compute-invoice');
const { validateOrderSetRefund, orderSetRefund } = require('./utils/refund');
const axios = require('axios');
const { kinesisEventTypes } = require('../../lib/aws-kinesis-logging');
const ComputeInvoice = require('./utils/new-compute-invoice');
const { convertLegacyPaymentMethod } = require('../order-payment-method/utils');
const { paymentMethodType } = require('../../payment-service/enums');

class OrderSet extends BaseModel {
  constructor(db, context) {
    super(db, 'order_sets', context);
    this.viewName = 'view_orders';
  }

  async getById(id) {
    if (!uuid.validate(id)) {
      const err = new Error('Invalid uuid');
      await fileLog(`invalid_uuid_${uuid.get()}`, err.stack.toString());
      return err;
    }
    const result = await super.getById(id);
    return orderSetPaymentMethod(result);
  }

  async getByIds(ids) {
    ids = isArray(ids) ? ids : [ids];
    let invalidId = null;
    const validUuid = ids.every(id => {
      if (!uuid.validate(id)) {
        invalidId = id;
        return false;
      }
      return true;
    });
    if (!validUuid) {
      const err = new Error('Invalid uuid');
      await fileLog(`invalid_uuid_${invalidId}`, err.stack.toString());
      return err;
    }
    const result = await super.getById(ids);
    return orderSetPaymentMethod(result);
  }

  async getDeliveryStatusByShortCode(shortCode) {
    shortCode = (shortCode || '').trim();

    if (shortCode) {
      const [deliveryOrder] = await this.roDb.select(
        'delivery_partner',
        'partner_order_id',
        'partner_reference_id',
        'estimated_time',
        'distance',
        'message'
      )
        .from('delivery_orders')
        .where('reference', shortCode);

      if (deliveryOrder) {
        let {
          partnerOrderId,
          partnerReferenceId,
          estimatedTime,
          distance,
          message,
        } = deliveryOrder;

        if (deliveryOrder.deliveryPartner === deliveryPartners.TALABAT ||
          deliveryOrder.deliveryPartner === deliveryPartners.BARQ) {
          let result = null;
          try {
            const { rows } = await this.roDb.raw(`
              SELECT
              id,
              status,
              reference,
              rider_id,
              rider_name,
              rider_contact_no,
              ST_X(rider_geolocation) as longitude,
              ST_Y(rider_geolocation) as latitude,
              order_url,
              track_url
              FROM delivery_order_statuses WHERE reference = ? ORDER by created_at DESC LIMIT 1
            `, shortCode);

            const [deliveryOrderStatus] = rows;

            if (deliveryOrderStatus) {
              if (estimatedTime !== null) {
                estimatedTime = new Date(estimatedTime).getMinutes();
                estimatedTime = parseFloat(estimatedTime);
              }
              if (distance === null) distance = 0;
              if (partnerReferenceId === null) partnerReferenceId = '';
              if (message === null) message = '';
              if (partnerOrderId === null) partnerOrderId = '';
            }

            result = {
              id: deliveryOrderStatus.id,
              reference: deliveryOrderStatus.reference,
              status: deliveryOrderStatus.status,
              riderId: deliveryOrderStatus.rider_id,
              riderName: deliveryOrderStatus.rider_name,
              riderContactNo: deliveryOrderStatus.rider_contact_no,
              orderUrl: deliveryOrderStatus.order_url,
              trackUrl: deliveryOrderStatus.track_url,
              riderCoordinates: {
                latitude: deliveryOrderStatus.latitude,
                longitude: deliveryOrderStatus.longitude
              }
            };

          } catch (ex) {
            estimatedTime = 0.0;
          }
          if (result !== null) {
            result['deliveryOrder'] = {
              distance,
              estimatedTime,
              message,
              partnerOrderId,
              partnerReferenceId,
            };

            return result;
          }
        }
      }

      const url = deliveryServiceUrl + '/api/delivery-order/track/' + shortCode;
      try {
        const response = await axios.get(url, { timeout: 5000 });
        if (response && response.data) {
          return response.data;
        }
        return null;
      } catch (err) {
        console.log('getDeliveryStatusByShortCode:error', err.message);
        return null;
      }
    }
    return null;
  }

  // eslint-disable-next-line max-params,complexity
  async getAllPaid(
    searchTerm,
    filterType,
    paging,
    dateRange,
    brandLocationId,
    brandId,
    countryId,
    curDate,
    queryType,
    fulfillmentType,
    couponId,
    couponCode
  ) {
    queryType = queryType || 'orderSets';
    let brandJoined = false;
    let brandLocationJoined = false;
    searchTerm = (searchTerm || '').trim().toLowerCase();
    filterType = (filterType || '').trim();
    fulfillmentType = (fulfillmentType || '').trim();
    const query = this.db(this.tableName)
      .select('order_sets.*')
      .join(
        'order_fulfillment',
        'order_sets.id',
        'order_fulfillment.order_set_id'
      )
      .where(function () {
        return this.where('order_sets.paid', true).orWhere({
          'order_sets.paid': false,
          'order_sets.cash_on_delivery': true,
          'order_sets.payment_method': orderPaymentMethods.CASH,
        });
      })
      // .orderBy('order_fulfillment.time', 'desc');
      .orderBy('order_sets.created_at', 'desc');

    const startDate = get(dateRange, 'startDate');
    // console.log('startDate', startDate);
    const endDate = get(dateRange, 'endDate');

    if (startDate) {
      query.where(
        'order_fulfillment.time',
        '>=',
        toDateWithTZ(startDate, 'start')
      );
    }

    if (endDate) {
      query.where('order_fulfillment.time', '<=', toDateWithTZ(endDate, 'end'));
    }

    if (brandLocationId) {
      query.where('order_sets.brand_location_id', brandLocationId);
    }

    // this is used to filter by current status of the order
    if (queryType === 'orderSets' && filterType && filterType !== 'ALL') {
      query.joinRaw(`
          INNER JOIN order_set_statuses ON order_set_statuses.id = (
            SELECT id FROM order_set_statuses
            WHERE order_set_statuses.order_set_id = order_sets.id
            ORDER BY order_set_statuses.created_at DESC LIMIT 1
        )
      `);
      query.where('order_set_statuses.status', '=', filterType);
    }
    // this is used to filter by group status (NEW,IN_PROGRESS,COMPLETED) of the order
    if (queryType === 'orderQueueSets' && filterType && filterType !== 'ALL') {
      // console.log(moment(toDateWithTZ(curDate, 'end')).format('YYYY-MM-DD'));
      query.whereRaw(
        `date(order_fulfillment.time) = '${moment(
          toDateWithTZ(curDate, 'end')
        ).format('YYYY-MM-DD')}'`
      );
      query.joinRaw(`
          INNER JOIN order_set_statuses ON order_set_statuses.id = (
            SELECT id FROM order_set_statuses
            WHERE order_set_statuses.order_set_id = order_sets.id
            ORDER BY order_set_statuses.created_at DESC LIMIT 1
        )
      `);
      switch (filterType) {
        case orderQueueSetStatusName.NEW:
          query.where(
            'order_set_statuses.status',
            '=',
            orderSetStatusNames.PLACED
          );
          break;
        case orderQueueSetStatusName.IN_PROGRESS:
          query.whereNotIn('order_set_statuses.status', [
            orderSetStatusNames.PLACED,
            orderSetStatusNames.REJECTED,
            orderSetStatusNames.COMPLETED,
            orderSetStatusNames.REPORTED,
          ]);
          break;
        case orderQueueSetStatusName.COMPLETED:
          query.where('order_set_statuses.status', '=', filterType);
          break;
        default:
          break;
      }
    }

    if (queryType === 'delayedOrderSets') {
      query.joinRaw(`
          INNER JOIN order_set_statuses ON order_set_statuses.id = (
            SELECT id FROM order_set_statuses
            WHERE order_set_statuses.order_set_id = order_sets.id
            ORDER BY order_set_statuses.created_at DESC LIMIT 1
        )
      `);
      query.whereNotExists(function () {
        return this.select('order_set_statuses.*')
          .from('order_set_statuses')
          .whereRaw(
            `
            (order_set_statuses.status = '${orderSetStatusNames.COMPLETED}'
            or order_set_statuses.status = '${orderSetStatusNames.REPORTED}'
            or order_set_statuses.status = '${orderSetStatusNames.REJECTED}')
          `
          )
          .andWhereRaw('order_sets.id = order_set_statuses.order_set_id');
      });
      query.andWhere(function () {
        return this.where(query =>
          query
            .where('order_fulfillment.type', fulfillmentTypeEnum.DELIVERY)
            .andWhereRaw("order_sets.created_at < now() - INTERVAL '25 min'")
        ).orWhere(query =>
          query
            .where('order_fulfillment.type', '!=', fulfillmentTypeEnum.DELIVERY)
            .andWhereRaw("order_sets.created_at < now() - INTERVAL '10 min'")
        );
      });
    }

    if (brandId) {
      brandLocationJoined = true;
      query
        .join(
          'brand_locations',
          'order_sets.brand_location_id',
          'brand_locations.id'
        )
        .where('brand_locations.brand_id', brandId);
    }
    if (searchTerm) {
      if (!brandId) {
        brandLocationJoined = true;
        query.join(
          'brand_locations',
          'order_sets.brand_location_id',
          'brand_locations.id'
        );
      }
      brandJoined = true;
      query
        .leftJoin('coupons', 'coupons.id', 'order_sets.coupon_id')
        .join('brands', 'brands.id', 'brand_locations.brand_id')
        .join(
          'brand_location_addresses',
          'brand_location_addresses.brand_location_id',
          'brand_locations.id'
        )
        .join('customers', 'customers.id', 'order_sets.customer_id')
        .andWhere(query => {
          query.whereRaw(`
            LOWER(order_sets.short_code) LIKE '%${searchTerm}%' OR
            LOWER(brands.name) LIKE '%${searchTerm}%' OR
            LOWER(brand_location_addresses.short_address) LIKE '%${searchTerm}%' OR
            LOWER(brand_location_addresses.street) LIKE '%${searchTerm}%' OR
            LOWER(brand_location_addresses.city) LIKE '%${searchTerm}%' OR
            LOWER(coupons.code) LIKE '%${searchTerm}%' OR
            LOWER(customers.email) LIKE '%${searchTerm}%' OR
            LOWER(customers.phone_number) LIKE '%${searchTerm}%'
          `);
        });
    }
    if (countryId) {
      if (!brandLocationJoined) {
        brandLocationJoined = true;
        query.join(
          'brand_locations',
          'order_sets.brand_location_id',
          'brand_locations.id'
        );
      }
      if (!brandJoined) {
        brandJoined = true;
        query.join('brands', 'brands.id', 'brand_locations.brand_id');
      }
      query.where('brands.country_id', countryId);
    }
    if (fulfillmentType) {
      query.where('order_fulfillment.type', fulfillmentType);
    }

    if (couponId) {
      query.where('order_sets.coupon_id', couponId);
    }

    if (couponCode) {
      query.leftJoin('coupons', 'coupons.id', 'order_sets.coupon_id');
      query.whereRaw(
        `LOWER(coupons.code) LIKE '%${couponCode.toLowerCase()}%'`
      );
    }

    // this.logWithQuery(query);
    // console.log(query.toString());
    const rawResults = await this.queryHelper(query)
      .addPaging(paging)
      .addCounting()
      .resolvePagedQuery();
    rawResults.items = orderSetPaymentMethod(rawResults.items);
    return rawResults;
  }

  // eslint-disable-next-line max-params
  async getAllPaidExportToCSV(
    stream,
    searchTerm,
    filterType,
    brandLocationId,
    brandId,
    countryId,
    startDate,
    endDate
  ) {
    searchTerm = (searchTerm || '').trim().toLowerCase();
    filterType = (filterType || '').trim();
    const query = this.roDb(this.tableName)
      .select(
        'order_sets.*',
        'order_payment_methods.payment_method as orderPaymentMethod',
        'order_set_statuses.status as currentStatus',
        'payment_statuses.name as paymentStatus',
        'brand_location_addresses.short_address as brandShortAddress',
        'brand_locations.name as brandLocationName',
        'brand_neigbhorhood.name as neighborhoodName',
        'brand_city.name as cityName',
        'order_fulfillment.courier_name as courierName',
        'order_fulfillment.type as type',
        'coupons.code as couponCode',
        'order_fulfillment.asap',
        'order_fulfillment.time as fulfillmentTime',
        'brands.name as brandName',
        'customers.first_name as firstName',
        'customers.last_name as lastName',
        'customers.email as email',
        'customers.phone_number as phoneNumber',
        'customers.phone_country as phoneCountry',
        'customer_neighborhood.name as customerNeighborhoodName',
        'customer_city.name as customerCityName',
        'currencies.iso_code as currencyCode',
        'currencies.decimal_place as currencyDecimalPlace',
        'currencies.lowest_denomination as currencyLowestDenomination',
        this.roDb.raw(
          '(select count(*) as items from order_items where order_set_id = order_sets.id) items'
        ),
        this.roDb.raw(
          '(select string_agg(name, \', \') from order_items where order_set_id = order_sets.id) as itemNames'
        ),
        this.roDb.raw(
          '(select string_agg(type, \', \') from customer_used_perks where order_set_id = order_sets.id) as perksRedeemed'
        ),
        this.roDb.raw(
          '(select string_agg(concat(name, \' (\', free_quantity ,\')\'),\', \') from order_items where order_set_id = order_sets.id and free_quantity > 0) as freeFood'
        ),
        this.roDb.raw(
          '(select sum((price - (price*perk_discount_multiplier))*(quantity - free_quantity)) from order_items where  order_set_id = order_sets.id) as rewardDiscountAmount'
        ),
        this.roDb.raw(
          '(select sum(price*free_quantity) from order_items where order_set_id = order_sets.id and free_quantity > 0) as freeItemAmount'
        ),
        this.roDb.raw(
          '(select points from reward_points_transactions where source = \'ORDER_SET\' and source_id = cast(order_sets.id as text)  order by created asc limit 1) as beans'
        ),
        this.roDb.raw(
          '(select sum(debit) from loyalty_transactions where order_type in (\'ORDER_SET\', \'CASHBACK\', \'REFERRAL\') and reference_order_id = cast(order_sets.id as text)) as credits'
        ),
        this.roDb.raw(
          '(select sum(debit) from gift_card_transactions where order_type = \'ORDER_SET\' and reference_order_id = cast(order_sets.id as text)) as giftCardCredits'
        ),
        this.roDb.raw(
          '(SELECT string_agg(concat(order_comments.comment,\' - by \', order_comments.user_name), \', \') FROM order_comments WHERE order_comments.order_set_id = order_sets.id) as internalComments'
        ),
        this.roDb.raw(`(SELECT sum(total) from (
          SELECT sum(COALESCE(order_item_options.compare_at_price,order_item_options.price))*order_items.quantity as total from order_items LEFT JOIN order_item_options ON order_item_options.order_item_id = order_items.id  where order_items.order_set_id = order_sets.id group by order_items.id
         ) as t) as compareAtPrice`),
        this.roDb.raw(
          `(SELECT Count(nc_os.id)
          FROM   order_sets nc_os
                 INNER JOIN brand_locations nc_bl
                         ON nc_os.brand_location_id = nc_bl.id
          WHERE  nc_os.customer_id = order_sets.customer_id
                 AND cast(nc_bl.brand_id as text) = cast(brand_locations.brand_id as text)
                 AND ( "nc_os"."paid" = true
                        OR ( "nc_os"."paid" = false
                             AND "nc_os"."cash_on_delivery" = true
                             AND "nc_os"."payment_method" = 'CASH' ) )) as noOfOrdersPerBrand`
        )
      )
      .leftJoin(
        'order_payment_methods',
        'order_payment_methods.reference_order_id',
        'order_sets.id'
      )
      .join(
        'order_fulfillment',
        'order_sets.id',
        'order_fulfillment.order_set_id'
      )
      .leftJoin(
        'delivery_addresses',
        'delivery_addresses.order_fulfillment_id',
        'order_fulfillment.id'
      )
      .leftJoin(
        'neighborhoods as customer_neighborhood',
        'customer_neighborhood.id',
        'delivery_addresses.neighborhood_id'
      )
      .leftJoin(
        'cities as customer_city',
        'customer_city.id',
        'customer_neighborhood.city_id'
      )
      .join('customers', 'customers.id', 'order_sets.customer_id')
      .where(function () {
        return this.where('order_sets.paid', true)
          .orWhere({
            'order_sets.paid': false,
            'order_sets.cash_on_delivery': true,
            'order_sets.payment_method': orderPaymentMethods.CASH,
          })
          .orWhere('order_sets.credits_used', true)
          .orWhereRaw(
            '(select sum(debit) from gift_card_transactions where order_type = \'ORDER_SET\' and reference_order_id = cast(order_sets.id as text)) is not null'
          );
      })
      .orderBy('order_fulfillment.time', 'desc');

    startDate = moment(startDate);
    endDate = moment(endDate);

    if (startDate) {
      query.where(
        'order_fulfillment.time',
        '>=',
        toDateWithTZ(startDate, 'start')
      );
    }

    if (endDate) {
      query.where('order_fulfillment.time', '<=', toDateWithTZ(endDate, 'end'));
    }

    if (brandLocationId) {
      query.where('order_sets.brand_location_id', brandLocationId);
    }
    // join to find current status
    query.joinRaw(`
          INNER JOIN order_set_statuses ON order_set_statuses.id = (
            SELECT id FROM order_set_statuses
            WHERE order_set_statuses.order_set_id = order_sets.id
            ORDER BY order_set_statuses.created_at DESC LIMIT 1
        )
      `);
    // join to find brand location
    query.join(
      'brand_locations',
      'order_sets.brand_location_id',
      'brand_locations.id'
    );
    query.join('currencies', 'currencies.id', 'brand_locations.currency_id');
    // join payment status
    // join to find current status
    query.joinRaw(`
          INNER JOIN payment_statuses ON payment_statuses.id = (
            SELECT id FROM payment_statuses
            WHERE payment_statuses.reference_order_id = order_sets.id
            ORDER BY payment_statuses.created_at DESC LIMIT 1
        )
      `);
    // join to find brands, addresses, counpon
    query
      .leftJoin('coupons', 'coupons.id', 'order_sets.coupon_id')
      .join('brands', 'brands.id', 'brand_locations.brand_id')
      .join(
        'brand_location_addresses',
        'brand_location_addresses.brand_location_id',
        'brand_locations.id'
      )
      .join(
        'neighborhoods as brand_neigbhorhood',
        'brand_neigbhorhood.id',
        'brand_location_addresses.neighborhood_id'
      )
      .join(
        'cities as brand_city',
        'brand_city.id',
        'brand_location_addresses.city_id'
      );
    if (filterType && filterType !== 'ALL') {
      query.where('order_set_statuses.status', '=', filterType);
    }
    if (brandId) {
      query.where('brand_locations.brand_id', brandId);
    }
    if (searchTerm) {
      query.andWhere(query => {
        query.whereRaw(`
            LOWER(order_sets.short_code) LIKE '%${searchTerm}%' OR
            LOWER(brands.name) LIKE '%${searchTerm}%' OR
            LOWER(brand_location_addresses.short_address) LIKE '%${searchTerm}%' OR
            LOWER(brand_location_addresses.street) LIKE '%${searchTerm}%' OR
            LOWER(brand_location_addresses.city) LIKE '%${searchTerm}%' OR
            LOWER(coupons.code) LIKE '%${searchTerm}%' OR
            LOWER(customers.email) LIKE '%${searchTerm}%' OR
            LOWER(customers.phone_number) LIKE '%${searchTerm}%'
          `);
      });
    }
    if (countryId) {
      query.where('brands.country_id', countryId);
    }
    // console.log('query', query.toString());
    return query
      .stream(s => s.pipe(new OrderReportFormatter()).pipe(stream))
      .catch(console.error);
  }

  async getOrderReport(
    stream,
    searchTerm,
    filterType,
    brandLocationId,
    brandId,
    countryId,
    startDate,
    endDate
  ) {
    searchTerm = (searchTerm || '').trim().toLowerCase();
    filterType = (filterType || '').trim();

    const subQuery = this.roDb.select(
      'o.short_code as order_short_id',
      'o.id as order_id',
      'o.created_at as order_date',
      'c.id as customer_id',
      'c.first_name as customer_name',
      'c.last_name as customer_surname',
      'f."type" as order_type',
      'f.courier_name',
      'b."name" as brand',
      'ct.iso_code',
      'bl."name" as branch',
      this.roDb.raw('string_agg(i."name", \', \') as item_list'),
      this.roDb.raw('sum(i.quantity) as sum_item_quantity'),
      this.roDb.raw('sum(i.free_quantity) as sum_free_item_quantity'),
      this.roDb.raw('sum(i.refunded_quantity) as sum_refunded_item_quantity'),
      'o.payment_method',
      'o.payment_provider',
      'o.total',
      'o.subtotal',
      'o.fee as service_fee',
      'o.current_status',
      'o.coupon_amount',
      'o.reward_amount',
      'cp.code as coupon_code',
      this.roDb.raw('(SELECT string_agg(concat(comment,\' - by \', user_name), \', \') FROM order_comments WHERE order_set_id = o.id) as internal_notes')
    ).from('order_sets as o')
      .leftJoin('order_items as i', 'o.id', 'i.order_set_id')
      .leftJoin('customers as c', 'o.customer_id', 'c.id')
      .leftJoin('order_fulfillment as f', 'f.order_set_id', 'o.id')
      .leftJoin('brand_locations as bl', 'o.brand_location_id', 'bl.id')
      .leftJoin('brands as b', 'bl.brand_id', 'b.id')
      .leftJoin('brand_location_addresses as a', 'bl.id', 'a.brand_location_id')
      .leftJoin('countries as ct', 'b.country_id', 'ct.id')
      .leftJoin('coupons as cp', 'o.coupon_id', 'cp.id')
      .whereNot('o.current_status', 'INITIATED');

    if (brandId) subQuery.andWhere('b.id', brandId);
    if (brandLocationId) subQuery.andWhere('bl.id', brandLocationId);
    if (countryId) subQuery.andWhere('ct.id', countryId);

    startDate = moment(startDate);
    endDate = moment(endDate);

    if (startDate) subQuery.andWhere(
      'o.created_at',
      '>=',
      toDateWithTZ(startDate, 'start')
    );

    if (endDate) subQuery.andWhere(
      'o.created_at',
      '<=',
      toDateWithTZ(endDate, 'end')
    );

    if (searchTerm) {
      subQuery.andWhere(subQuery => {
        subQuery.whereRaw(`
            LOWER(o.short_code) LIKE '%${searchTerm}%' OR
            LOWER(b.name) LIKE '%${searchTerm}%' OR
            LOWER(cp.code) LIKE '%${searchTerm}%' OR
            LOWER(c.email) LIKE '%${searchTerm}%' OR
            LOWER(c.phone_number) LIKE '%${searchTerm}%'
          `);
      });
    }

    subQuery.groupByRaw(`o.id, c.id, c.first_name, c.last_name, f."type", f.courier_name, b."name", ct.iso_code, bl."name",
      o.payment_method, o.payment_provider, o.total, o.subtotal, o.fee, o.current_status, o.coupon_amount, o.reward_amount,
      cp.code
    `);

    const query = this.roDb
      .select(
        this.roDb.raw(`
          orders.order_date,
          orders.order_short_id,
          orders.order_id,
          orders.customer_id,
          orders.customer_name,
          orders.customer_surname,
          orders.brand,
          orders.branch,
          orders.iso_code,
          orders.current_status,
          orders.order_type,
          orders.payment_method,
          orders.payment_provider,
          orders.courier_name,
          orders.item_list,
          orders.sum_item_quantity,
          orders.sum_free_item_quantity,
          orders.subtotal,
          orders.service_fee,
          pre_paid.creditsUsed as credit_used,
          pre_paid.discoveryCreditUsed as discovery_credit_used,
          pre_paid.giftCards as gift_cards,
          orders.reward_amount,
          orders.coupon_amount,
          orders.coupon_code,
          (orders.subtotal +
          orders.service_fee -
          orders.reward_amount -
          orders.coupon_amount -
          pre_paid.creditsUsed -
          pre_paid.discoveryCreditUsed -
          pre_paid.giftCards) as amount_to_be_paid,
          orders.internal_notes
        `)
      ).from(subQuery.as('orders'))
      .joinRaw(
        `left join (
          select id as order_id,
            COALESCE(cast(pre_paid->>'creditsUsed' as float),0.0) as creditsUsed,
            COALESCE(cast(pre_paid->>'discoveryCreditUsed' as float),0.0) as discoveryCreditUsed,
            COALESCE(cast(pre_paid->'giftCards'->0->>'value' as float),0.0) as giftCards
          from order_sets
          ) as pre_paid
        on orders.order_id = pre_paid.order_id`
      );

    return query
      .stream(s => s.pipe(new NewOrderReportFormatter()).pipe(stream))
      .catch(console.error);
  }

  // eslint-disable-next-line max-params
  async financialReportExportToCSV(
    stream,
    searchTerm,
    filterType,
    brandLocationId,
    brandId,
    startDate,
    endDate,
    countryId
  ) {
    searchTerm = (searchTerm || '').trim().toLowerCase();
    filterType = (filterType || '').trim();
    const query = this.roDb(this.tableName)
      .select(
        'order_sets.*',
        'order_payment_methods.payment_method as orderPaymentMethod',
        'order_set_statuses.status as currentStatus',
        'payment_statuses.name as paymentStatus',
        'order_fulfillment.courier_name as courierName',
        'order_fulfillment.type as type',
        'coupons.code as couponCode',
        'order_fulfillment.asap',
        'order_fulfillment.time as fulfillmentTime',
        'brands.name as brandName',
        'delivery_addresses.neighborhood_name as deliveryAddressNeighborhoodName',
        'customers.first_name as firstName',
        'customers.last_name as lastName',
        'customers.email',
        'customers.phone_number as phoneNumber',
        'currencies.iso_code as currencyCode',
        'currencies.decimal_place as currencyDecimalPlace',
        'currencies.lowest_denomination as currencyLowestDenomination',
        this.roDb.raw(`
          (select sum(refunded_quantity) from order_items where order_set_id = order_sets.id) as refundedItems,
          (select sum(credit) from loyalty_transactions where order_type = 'ORDER_SET' and reference_order_id = cast(order_sets.id as text)) as refundedCredits,
          (select sum(credit) from gift_card_transactions where order_type = 'ORDER_SET' and reference_order_id = cast(order_sets.id as text)) as refundedGiftCardCredits,
          (select sum(debit) from loyalty_transactions where order_type in ('ORDER_SET', 'CASHBACK', 'REFERRAL') and reference_order_id = cast(order_sets.id as text)) as credits,
          (select sum(debit) from gift_card_transactions where order_type = 'ORDER_SET' and reference_order_id = cast(order_sets.id as text)) as giftCardCredits,
          (select sum((price - (price*perk_discount_multiplier))*(quantity - free_quantity)) from order_items where  order_set_id = order_sets.id) as rewardDiscountAmount,
          (SELECT string_agg(concat(order_comments.comment,' - by ', order_comments.user_name), ', ') FROM order_comments WHERE order_comments.order_set_id = order_sets.id) as internalComments,
          (SELECT sum(total) from (
            SELECT sum(COALESCE(order_item_options.compare_at_price,order_item_options.price))*order_items.quantity as total from order_items LEFT JOIN order_item_options ON order_item_options.order_item_id = order_items.id  where order_items.order_set_id = order_sets.id group by order_items.id
           ) as t) as compareAtPrice,
          (SELECT Count(nc_os.id)
          FROM   order_sets nc_os
                 INNER JOIN brand_locations nc_bl
                         ON nc_os.brand_location_id = nc_bl.id
          WHERE  nc_os.customer_id = order_sets.customer_id
                 AND cast(nc_bl.brand_id as text) = cast(brand_locations.brand_id as text)
                 AND ( "nc_os"."paid" = true
                        OR ( "nc_os"."paid" = false
                             AND "nc_os"."cash_on_delivery" = true
                             AND "nc_os"."payment_method" = 'CASH' ) )) as noOfOrdersPerBrand
        `)
      )
      .leftJoin(
        'order_payment_methods',
        'order_payment_methods.reference_order_id',
        'order_sets.id'
      )
      .join(
        'order_fulfillment',
        'order_sets.id',
        'order_fulfillment.order_set_id'
      )
      .leftJoin(
        'delivery_addresses',
        'order_fulfillment.id',
        'delivery_addresses.order_fulfillment_id'
      )
      .join('customers', 'customers.id', 'order_sets.customer_id')
      .where(function () {
        return this.where('order_sets.paid', true)
          .orWhere({
            'order_sets.paid': false,
            'order_sets.cash_on_delivery': true,
            'order_sets.payment_method': orderPaymentMethods.CASH,
          })
          .orWhere('order_sets.credits_used', true)
          .orWhereRaw(
            '(select sum(debit) from gift_card_transactions where order_type = \'ORDER_SET\' and reference_order_id = cast(order_sets.id as text)) is not null'
          );
      })
      .orderBy('order_fulfillment.time', 'desc');

    startDate = moment(startDate);
    endDate = moment(endDate);

    if (startDate) {
      query.where(
        'order_fulfillment.time',
        '>=',
        toDateWithTZ(startDate, 'start')
      );
    }

    if (endDate) {
      query.where('order_fulfillment.time', '<=', toDateWithTZ(endDate, 'end'));
    }

    if (brandLocationId) {
      query.where('order_sets.brand_location_id', brandLocationId);
    }
    // join to find current status
    query.joinRaw(`
          INNER JOIN order_set_statuses ON order_set_statuses.id = (
            SELECT id FROM order_set_statuses
            WHERE order_set_statuses.order_set_id = order_sets.id
            ORDER BY order_set_statuses.created_at DESC LIMIT 1
        )
      `);
    // join to find brand location
    query.join(
      'brand_locations',
      'order_sets.brand_location_id',
      'brand_locations.id'
    );
    query.join('currencies', 'currencies.id', 'brand_locations.currency_id');
    // join payment status
    // join to find current status
    query.joinRaw(`
          INNER JOIN payment_statuses ON payment_statuses.id = (
            SELECT id FROM payment_statuses
            WHERE payment_statuses.reference_order_id = order_sets.id
            ORDER BY payment_statuses.created_at DESC LIMIT 1
        )
      `);
    // join to find brands, addresses, counpon
    query
      .leftJoin('coupons', 'coupons.id', 'order_sets.coupon_id')
      .join('brands', 'brands.id', 'brand_locations.brand_id');
    if (filterType && filterType !== 'ALL') {
      query.where('order_set_statuses.status', '=', filterType);
    }
    if (brandId) {
      query.where('brand_locations.brand_id', brandId);
    }
    if (countryId) {
      query.where('brands.country_id', countryId);
    }
    if (searchTerm) {
      query.andWhere(query => {
        query.whereRaw(`
            LOWER(order_sets.short_code) LIKE '%${searchTerm}%' OR
            LOWER(brands.name) LIKE '%${searchTerm}%' OR
            LOWER(customers.first_name) LIKE '%${searchTerm}%' OR
            LOWER(customers.last_name) LIKE '%${searchTerm}%' OR
            LOWER(coupons.code) LIKE '%${searchTerm}%' OR
            LOWER(customers.email) LIKE '%${searchTerm}%' OR
            LOWER(customers.phone_number) LIKE '%${searchTerm}%'
          `);
      });
    }
    // console.log(query.toString());

    return query
      .stream(s => s.pipe(new FinancialReportFormatter()).pipe(stream))
      .catch(console.error);
  }

  // eslint-disable-next-line max-params
  async orderSetStatusTotal(
    searchTerm,
    dateRange,
    brandLocationId,
    brandId,
    countryId,
    curDate,
    queryType,
    fulfillmentType,
    couponId,
    couponCode
  ) {
    queryType = queryType || 'orderSetStatusTotal';
    let brandJoined = false;
    let brandLocationJoined = false;
    searchTerm = (searchTerm || '').trim().toLowerCase();
    fulfillmentType = (fulfillmentType || '').trim();

    let statusCounts = '';
    let data = {};
    switch (queryType) {
      case 'orderSetStatusTotal':
        data = {
          initiated: 0,
          placed: 0,
          paymentfailure: 0,
          paymentcanceled: 0,
          accepted: 0,
          rejected: 0,
          reported: 0,
          preparing: 0,
          prepared: 0,
          waitingforcourier: 0,
          outfordelivery: 0,
          delivered: 0,
          readyforpickup: 0,
          completed: 0,
          grandtotal: 0,
        };
        statusCounts = `
          sum(case when order_set_statuses.status = 'INITIATED' then 1 else 0 end) as initiated,
          sum(case when order_set_statuses.status = 'PLACED' then 1 else 0 end) as PLACED,
          sum(case when order_set_statuses.status = 'PAYMENT_FAILURE' then 1 else 0 end) as paymentfailure,
          sum(case when order_set_statuses.status = 'PAYMENT_CANCELED' then 1 else 0 end) as paymentcanceled,
          sum(case when order_set_statuses.status = 'ACCEPTED' then 1 else 0 end) as accepted,
          sum(case when order_set_statuses.status = 'REJECTED' then 1 else 0 end) as rejected,
          sum(case when order_set_statuses.status = 'REPORTED' then 1 else 0 end) as reported,
          sum(case when order_set_statuses.status = 'PREPARING' then 1 else 0 end) as preparing,
          sum(case when order_set_statuses.status = 'PREPARED' then 1 else 0 end) as prepared,
          sum(case when order_set_statuses.status = 'WAITING_FOR_COURIER' then 1 else 0 end) as waitingforcourier,
          sum(case when order_set_statuses.status = 'OUT_FOR_DELIVERY' then 1 else 0 end) as outfordelivery,
          sum(case when order_set_statuses.status = 'DELIVERED' then 1 else 0 end) as delivered,
          sum(case when order_set_statuses.status = 'READY_FOR_PICKUP' then 1 else 0 end) as readyforpickup,
          sum(case when order_set_statuses.status = 'COMPLETED' then 1 else 0 end) as completed,
          count(*) as grandtotal
        `;
        break;
      case 'orderQueueSetStatusTotal':
        data = {
          new: 0,
          inprogress: 0,
          completed: 0,
        };
        statusCounts = `
          sum(case when order_set_statuses.status = 'PLACED' then 1 else 0 end) as new,
          sum(case when order_set_statuses.status not in ('PLACED','REJECTED', 'REPORTED','COMPLETED') then 1 else 0 end) as inprogress,
          sum(case when order_set_statuses.status = 'COMPLETED' then 1 else 0 end) as completed
        `;
        break;
      default:
        data = {};
        break;
    }

    const query = this.db(this.tableName)
      .select(
        this.db.raw(
          `
          ${statusCounts}
          `
        )
      )
      .join(
        'order_fulfillment',
        'order_sets.id',
        'order_fulfillment.order_set_id'
      )
      .where(function () {
        return this.where('order_sets.paid', true).orWhere({
          'order_sets.paid': false,
          'order_sets.cash_on_delivery': true,
          'order_sets.payment_method': orderPaymentMethods.CASH,
        });
      })
      .joinRaw(
        `
          INNER JOIN order_set_statuses ON order_set_statuses.id = (
            SELECT id FROM order_set_statuses
            WHERE order_set_statuses.order_set_id = order_sets.id
            ORDER BY order_set_statuses.created_at DESC LIMIT 1
        )
      `
      )
      .groupBy('order_set_statuses.status');
    const startDate = get(dateRange, 'startDate');
    const endDate = get(dateRange, 'endDate');

    if (startDate) {
      query.where(
        'order_fulfillment.time',
        '>=',
        toDateWithTZ(startDate, 'start')
      );
    }

    if (endDate) {
      query.where('order_fulfillment.time', '<=', toDateWithTZ(endDate, 'end'));
    }

    if (brandLocationId) {
      query.where('order_sets.brand_location_id', brandLocationId);
    }

    if (brandId) {
      brandLocationJoined = true;
      query
        .join(
          'brand_locations',
          'order_sets.brand_location_id',
          'brand_locations.id'
        )
        .where('brand_locations.brand_id', brandId);
    }
    if (queryType === 'orderQueueSetStatusTotal') {
      query.whereRaw(
        `date(order_fulfillment.time) = '${moment(
          toDateWithTZ(curDate, 'end')
        ).format('YYYY-MM-DD')}'`
      );
    }
    if (searchTerm) {
      if (!brandId) {
        brandLocationJoined = true;
        query.join(
          'brand_locations',
          'order_sets.brand_location_id',
          'brand_locations.id'
        );
      }
      brandJoined = true;
      query
        .leftJoin('coupons', 'coupons.id', 'order_sets.coupon_id')
        .join('brands', 'brands.id', 'brand_locations.brand_id')
        .join(
          'brand_location_addresses',
          'brand_location_addresses.brand_location_id',
          'brand_locations.id'
        )
        .andWhere(query => {
          query.whereRaw(`
            LOWER(order_sets.short_code) LIKE '%${searchTerm}%' OR
            LOWER(brands.name) LIKE '%${searchTerm}%' OR
            LOWER(brand_location_addresses.short_address) LIKE '%${searchTerm}%' OR
            LOWER(brand_location_addresses.street) LIKE '%${searchTerm}%' OR
            LOWER(brand_location_addresses.city) LIKE '%${searchTerm}%' OR
            LOWER(coupons.code) LIKE '%${searchTerm}%'
          `);
        });
    }

    if (countryId) {
      if (!brandLocationJoined) {
        brandLocationJoined = true;
        query.join(
          'brand_locations',
          'order_sets.brand_location_id',
          'brand_locations.id'
        );
      }
      if (!brandJoined) {
        brandJoined = true;
        query.join('brands', 'brands.id', 'brand_locations.brand_id');
      }
      query.where('brands.country_id', countryId);
    }

    if (fulfillmentType) {
      query.where('order_fulfillment.type', fulfillmentType);
    }

    if (couponId) {
      query.where('order_sets.coupon_id', couponId);
    }

    if (couponCode) {
      query.leftJoin('coupons', 'coupons.id', 'order_sets.coupon_id');
      query.whereRaw(
        `LOWER(coupons.code) LIKE '%${couponCode.toLowerCase()}%'`
      );
    }

    const rawResults = await query;

    rawResults.forEach(node => {
      for (const key in node) {
        if (Object.prototype.hasOwnProperty.call(node, key)) {
          data[key] += parseInt(node[key], 10);
        }
      }
    });
    data.paymentFailure = data.paymentfailure;
    delete data.paymentfailure;
    data.paymentCanceled = data.paymentcanceled;
    delete data.paymentcanceled;
    data.waitingForCourier = data.waitingforcourier;
    delete data.waitingforcourier;
    data.outForDelivery = data.outfordelivery;
    delete data.outfordelivery;
    data.readyForPickup = data.readyforpickup;
    delete data.readyforpickup;
    data.inProgress = data.inprogress;
    delete data.inprogress;
    data.grandTotal = data.grandtotal;
    delete data.grandtotal;
    return data;
    // return orderSetPaymentMethod(rawResults);
  }

  // get customer's last order
  async getCustomerLastOrder(customerId) {
    return this.db(this.tableName)
      .where('customer_id', customerId)
      .orderBy('created_at', 'desc')
      .then(first);
  }

  // Retrieve Orders
  // yeah basically just an array of order sets where the expected fulfillment time is today
  // TODO:: This Query requires some more definition on where its going to be used.
  async getAllActive(paging) {
    let query = ` Select * from order_sets where id in (
                    Select order_set_id from  (
                      select order_set_id,status,row_number() over (partition by order_set_id order by created_at DESC) as ix
                      from order_set_statuses
                    ) sq where sq.ix = 1 and sq.STATUS NOT IN ('ACCEPTED','REJECTED')
                ) order by created_at desc `;

    if (paging) {
      query += `limit ${paging.limit} offset ${paging.offset} `;
    }
    const results = await this.db
      .raw(query)
      .then(result => transformToCamelCase(result.rows));

    return results;
  }

  // Get order to be tracked
  async getOrderToBeTracked(customerId) {
    const query = ` Select o.id as id , o.current_status as status, o.short_code, of.type as fulfillment_type
    from order_sets o
    LEFT JOIN order_fulfillment as of ON of.order_set_id = o.id
    WHERE
      o.customer_id = '${customerId}' and
      o.created_at > (NOW() - INTERVAL '2 hours') and
      o.refunded is FALSE and
      (
        o.current_status in
        (
          'INITIATED',
          'PLACED',
          'ACCEPTED',
          'PREPARING',
          'PREPARED',
          'WAITING_FOR_COURIER',
          'READY_FOR_PICKUP',
          'OUT_FOR_DELIVERY',
          'DELIVERY_DELAYED'
        )
      )
    ORDER BY o.created_at DESC LIMIT 1 `;

    const results = await this.roDb
      .raw(query)
      .then(result => transformToCamelCase(result.rows));
    if (results.length > 0 && results[0].status === 'INITIATED') results[0].status = 'PLACED';
    return results;
  }

  async getCountByCustomer(customerId) {
    const query = this.roDb(this.tableName)
      .count('order_sets.id as cnt')
      .where('customer_id', customerId)
      .where(function () {
        return this.where('order_sets.paid', true).orWhere({
          'order_sets.paid': false,
          'order_sets.cash_on_delivery': true,
          'order_sets.payment_method': orderPaymentMethods.CASH,
        });
      });
    const rows = await query;
    return rows ? Number(rows[0].cnt) : 0;
  }

  async getCountByCustomerForBrand(customerId, brandId) {
    const query = this.roDb(this.tableName)
      .count('order_sets.id as cnt')
      .join(
        'brand_locations',
        'order_sets.brand_location_id',
        'brand_locations.id'
      )
      .where('customer_id', customerId)
      .where('brand_locations.brand_id', brandId)
      .where(function () {
        return this.where('order_sets.paid', true).orWhere({
          'order_sets.paid': false,
          'order_sets.cash_on_delivery': true,
          'order_sets.payment_method': orderPaymentMethods.CASH,
        });
      });
    const rows = await query;
    return rows ? Number(rows[0].cnt) : 0;
  }

  async getCountByCustomerForBrandUsingParticularCoupon(
    customerId,
    brandId,
    couponId
  ) {
    const query = this.roDb(this.tableName)
      .count('order_sets.id as cnt')
      .join(
        'brand_locations',
        'order_sets.brand_location_id',
        'brand_locations.id'
      )
      .where('customer_id', customerId)
      .where('brand_locations.brand_id', brandId)
      .where('order_sets.coupon_id', couponId)
      .where(function () {
        return this.where('order_sets.paid', true).orWhere({
          'order_sets.paid': false,
          'order_sets.cash_on_delivery': true,
          'order_sets.payment_method': orderPaymentMethods.CASH,
        });
      });
    const rows = await query;
    return rows ? Number(rows[0].cnt) : 0;
  }

  async getTotalKdSpentByCustomer(customerId) {
    const query = `SELECT
        sum(order_sets.total) AS totalKdSpent
      FROM
        order_sets
      JOIN payment_statuses ON
        order_sets.id = payment_statuses.reference_order_id
      WHERE
        payment_statuses.order_type = '${paymentStatusOrderType.ORDER_SET}'
        AND payment_statuses."name" = '${paymentStatusName.PAYMENT_SUCCESS}'
        AND order_sets.customer_id = ?`;

    const rows = await this.db
      .raw(query, [customerId])
      .then(result => transformToCamelCase(result.rows));

    return rows ? Number(rows[0].totalkdspent).toFixed(3) : 0;
  }

  getAllByCustomer({ paging, orderStatuses, currencyId }) {
    const query = this.roDb(this.tableName)
      .select('order_sets.*')
      .where('order_sets.customer_id', this.context.auth.id)
      .orderBy('order_sets.created_at', 'desc');
    if (orderStatuses) {
      query.whereIn('order_sets.current_status', orderStatuses);
    }
    const { limit = 5, offset = 0 } = paging || {};
    query.limit(limit).offset(offset);
    if (currencyId) {
      query.where('currency_id', currencyId);
    }
    return query;
  }

  getByCustomer(customerId, paging) {
    let query = `SELECT *  FROM order_sets WHERE id IN (
                    SELECT DISTINCT reference_order_id AS order_set_id
                    FROM payment_statuses
                    WHERE order_type='ORDER_SET'
                    AND name='PAYMENT_SUCCESS'
                    AND reference_order_id in (
                      SELECT id FROM order_sets WHERE customer_id = ?
                    )
                  ) order by created_at DESC `;

    if (paging) {
      query += ` limit ${paging.limit} `;
      if (paging.offset) query += ` offset ${paging.offset} `;
    }
    return this.db
      .raw(query, [customerId])
      .then(result => transformToCamelCase(result.rows));
  }

  getByShortCode(shortCode) {
    return this.db(this.tableName).where('short_code', shortCode.toUpperCase());
  }

  getByMerchantId(merchantId) {
    return this.db(this.tableName)
      .where('merchant_id', merchantId)
      .then(first);
  }

  async getOrderSetsByCustomer(customerId, countryId, scanedPastYear = 0) {
    scanedPastYear = scanedPastYear < 0 ? 0 : scanedPastYear;
    const startDate = moment()
      .subtract(scanedPastYear, 'year')
      .startOf('year');
    const endDate = moment()
      .subtract(scanedPastYear, 'year')
      .endOf('year');
    const ordersQuery = this.roDb
      .select(
        this.roDb
          .raw(`short_code, created_at, id, current_status, brand_location_id as branch_id, total, CASE WHEN (
          current_status IS NULL OR
          current_status = '${orderSetStatusNames.COMPLETED}'::order_set_statuses_enum OR
          current_status = '${orderSetStatusNames.REJECTED}'::order_set_statuses_enum OR
          current_status = '${orderSetStatusNames.REPORTED}'::order_set_statuses_enum OR
          current_status = '${orderSetStatusNames.DELIVERED}'::order_set_statuses_enum) THEN true ELSE false END AS is_past `)
      )
      .from('order_sets')
      .whereNot('current_status', orderSetStatusNames.INITIATED)
      .andWhere('customer_id', customerId)
      .andWhere('created_at', '>=', toDateWithTZ(startDate, 'start'))
      .andWhere('created_at', '<=', toDateWithTZ(endDate, 'end'))
      .orderBy('created_at', 'desc')
      .limit(50);

    let orders = await ordersQuery;
    const brandLocationIds = [];
    const brandIds = [];
    await Promise.all(
      orders.map(order => {
        if (!brandLocationIds.includes(order.branchId)) {
          brandLocationIds.push(order.branchId);
        }
        return order;
      })
    );
    const brandLocationList = await this.roDb('brand_locations')
      .select(
        'id as branch_id',
        'brand_id',
        'name as branch_name',
        'name_ar as branch_name_ar',
        'name_tr as branch_name_tr'
      )
      .whereIn('id', brandLocationIds);
    await Promise.all(
      brandLocationList.map(bl => {
        if (!brandIds.includes(bl.brandId)) {
          brandIds.push(bl.brandId);
        }
        return bl;
      })
    );
    const query = this.roDb('brands')
      .select(
        'id as brand_id',
        'name as brand_name',
        'name_ar as brand_name_ar',
        'name_tr as brand_name_tr',
        'favicon'
      )
      .whereIn('id', brandIds);
    if (countryId) query.where('country_id', countryId);
    const brandList = await query;
    orders = await Promise.all(
      orders.map(order => {
        const branch = find(brandLocationList, { branchId: order.branchId });
        const brand = find(brandList, { brandId: branch.brandId });
        if (!brand) return null;
        const fieldFromBranch = pick(branch, [
          'branchName',
          'branchNameAr',
          'branchNameTr',
        ]);
        const fieldFromBrand = pick(brand, [
          'brandId',
          'brandName',
          'brandNameAr',
          'brandNameTr',
          'favicon',
        ]);
        order = { ...order, ...fieldFromBranch, ...fieldFromBrand };
        return addLocalizationField(
          addLocalizationField(order, 'branchName'),
          'brandName'
        );
      })
    );
    orders = orders.filter(n => n);
    return orders;
  }

  /**
   * The getOrderSetsByCustomer function is used by the getAllOrdersByCustomer resolver
   * It is deprecated but old customers continue to use it
   * When all client are updated please remove both(resolver and function)
   * and update this function name
   */
  async getOrderSetsByCustomerNew(customerId, countryId, paging) {
    let pageVal = 1;
    let perPageVal = 20;
    if (paging) {
      pageVal = paging.page;
      perPageVal = paging.perPage;
    }
    const pastOrderStatuses = [
      orderSetStatusNames.COMPLETED,
      orderSetStatusNames.REJECTED,
      orderSetStatusNames.REPORTED,
      orderSetStatusNames.DELIVERED,
      orderSetStatusNames.PAYMENT_FAILURE,
      orderSetStatusNames.PAYMENT_CANCELED
    ];

    const select = `os.short_code, os.created_at, os.id, os.current_status, os.brand_location_id as branch_id, os.total,
        bl.name as branch_name, bl.name_ar as branch_name_ar, bl.name_tr as branch_name_tr, bl.brand_id,
        b.name as brand_name, b.name_ar as brand_name_ar, b.name_tr as brand_name_tr, b.favicon`;
    const ordersQuery = this.roDb('order_sets as os')
      .leftJoin('brand_locations as bl', 'bl.id', 'os.brand_location_id')
      .leftJoin('brands as b', 'b.id', 'bl.brand_id')
      .whereNot('os.current_status', orderSetStatusNames.INITIATED)
      .andWhere('os.customer_id', customerId)
      .andWhere('b.country_id', countryId)
      .andWhereRaw('os.created_at >= (now() - INTERVAL \'1 year\')');

    const pendingOrdersQuery = ordersQuery.clone();
    const pendingOrders = await pendingOrdersQuery.select(this.roDb.raw(select))
      .whereNotIn('os.current_status', pastOrderStatuses)
      .orderBy('os.created_at', 'desc')
      .limit(5);
    const countQuery = ordersQuery.clone();
    const pastOrders = await ordersQuery.select(this.roDb.raw(select))
      .whereIn('os.current_status', pastOrderStatuses)
      .orderBy('os.created_at', 'desc')
      .offset((pageVal - 1) * perPageVal)
      .limit(perPageVal);
    const { count } = await countQuery.count('*').whereIn('os.current_status', pastOrderStatuses).first();
    pastOrders.map(order => {
      return addLocalizationField(
        addLocalizationField(order, 'branchName'),
        'brandName'
      );
    });
    pendingOrders.map(order => {
      return addLocalizationField(
        addLocalizationField(order, 'branchName'),
        'brandName'
      );
    });
    const resp = this.addRefreshPagingWithSliced(pastOrders, pageVal, perPageVal, count);
    return { pendingOrders, pastOrders: resp };
  }

  async getPastOrderSetsByCustomer(customerId, paging) {
    const query = `${this.sqlForOrderSetsWithStatuses()}
WHERE
  (oss.status = '${orderSetStatusNames.COMPLETED}' OR oss.status = '${orderSetStatusNames.REJECTED}' OR oss.status = '${orderSetStatusNames.REPORTED}')
AND
  os.customer_id = ?
ORDER BY os.created_at DESC
OFFSET ? LIMIT ?
`;
    const limit = get(paging, 'limit', 20);
    const offset = get(paging, 'offset', 0);

    return this.db
      .raw(query, [customerId, offset, limit])
      .then(result => transformToCamelCase(result.rows));
  }

  async getUpcomingOrderSetsByCustomer(customerId, paging) {
    const query = `
${this.sqlForOrderSetsWithStatuses()}
WHERE
oss.status <> '${orderSetStatusNames.COMPLETED}'
AND
  oss.status <> '${orderSetStatusNames.REJECTED}'
AND
  oss.status <> '${orderSetStatusNames.REPORTED}'
AND
  os.customer_id = ?
ORDER BY os.created_at DESC
OFFSET ? LIMIT ?
`;
    const limit = get(paging, 'limit', 20);
    const offset = get(paging, 'offset', 0);

    return this.db
      .raw(query, [customerId, offset, limit])
      .then(result => transformToCamelCase(result.rows));
  }

  sqlForOrderSetsWithStatuses() {
    return `
    SELECT os.*
    FROM   order_sets AS os
          JOIN order_set_statuses AS oss
            ON oss.id = (SELECT id
                          FROM   order_set_statuses
                          WHERE  order_set_statuses.order_set_id = os.id
                          ORDER  BY created_at DESC
                          LIMIT  1)
`;
  }

  async setAcknowledged(id) {
    await this.db(this.tableName)
      .where('id', id)
      .update({ acknowledged: true });
    this._idLoader.clear(id);
    return id;
  }

  // async getInfoForDelivery(id) {
  //   const { query, params } = deliveryInfoQueryBuilder(id);
  //   const results = await this.context.graphql(query, params);
  //
  //   if (!results.data || !results.data.orderSet) {
  //     throw new Error(`Could not get deliveryInfo for order with id: ${id}`);
  //   }
  //   const member = results.data.orderSet.member;
  //
  //   const deliveryAddress =
  //     results.data.orderSet.relevantOrder.fulfillment.deliveryAddress;
  //
  //   let streetAddress = `${deliveryAddress.streetNumber} ${deliveryAddress.avenue} ${deliveryAddress.street}`;
  //   if (deliveryAddress.floor !== '')
  //     streetAddress += `, Floor: ${deliveryAddress.floor}`;
  //   if (deliveryAddress.unitNumber !== '')
  //     streetAddress += `, Unit Number: ${deliveryAddress.unitNumber}`;
  //   if (deliveryAddress.neighborhoodName !== '')
  //     streetAddress += `, Neighborhood: ${deliveryAddress.neighborhoodName}`;
  //   if (deliveryAddress.note !== '')
  //     streetAddress += `, Note: ${deliveryAddress.note}`;
  //
  //   const data = {
  //     partnerReferenceID: results.data.orderSet.id,
  //     /** Make sure to check for Duplicate Key errors.
  //      * At the time of this writting, the API returns duplicate key errors like this:
  //      * (Not just a JSON object but an error dump as a string with the following text)
  //      * File: <br />/var/www/sandbox.flickapp.me/site/classes/MySQL.php<br /><br />Line: <br />296 <br />
  //      * <br />Message: <br />Duplicate entry \'25-aecda996-94d7-43f5-9cfe-031496b4845d\' for key \'OrderPartnerID\' <br />
  //      * <br />Trace: <br />#0 /var/www/sandbox.flickapp.me/site/classes/Thing.php(721): MySQL->insert(\'Orders\', Array)\n
  //      * #1 /var/www/sandbox.flickapp.me/site/classes/Order.php(413): Thing->persist()\n
  //      * #2 /var/www/sandbox.flickapp.me/site/api/v1/order.php(107): Order->add(Array)\n
  //      * #3 {main}{"result":false,"code":999,"message":"Duplicate entry \'25-aecda996-94d7-43f5-9cfe-031496b4845d\' for key \'OrderPartnerID\'","jsonapi":{"version":1},"debug":{"benchmark":{"elapsedTime":"54ms","memoryPeak":"2.00Mb","memoryUsage":"2.00Mb"}}}' }
  //      */
  //     totalPrice: results.data.orderSet.total,
  //     member: JSON.stringify(member),
  //     deliveryAddress: JSON.stringify({
  //       name: deliveryAddress.name,
  //       partnerReferenceID: deliveryAddress.partnerReferenceID,
  //       latitude: deliveryAddress.latitude,
  //       longitude: deliveryAddress.longitude,
  //       cityID: cityId,
  //       postalCode: '',
  //       text: streetAddress,
  //     }),
  //     storeID: results.data.orderSet.brandLocation.flickStoreId,
  //   };
  //   return data;
  // }

  checkForCreditLock({ useCredits }) {
    if (useCredits) {
      return this.db.raw(
        'LOCK TABLE loyalty_transactions IN ACCESS EXCLUSIVE MODE'
      );
    }
    return null;
  }

  checkForGiftCardLock({ giftCardId }) {
    if (giftCardId && giftCardId.length > 0) {
      return this.db.raw(
        'LOCK TABLE gift_card_transactions IN ACCESS EXCLUSIVE MODE'
      );
    }
    return null;
  }

  // eslint-disable-next-line complexity
  async getInvoiceByOrderSetId(orderSetId) {
    const orderSet = await this.getById(orderSetId);
    const currency = await this.context.currency.getById(orderSet.currencyId);
    let amountPaid = 0;
    const components = [
      {
        type: invoiceComponentType.TOTAL,
        value: new KD(
          orderSet.total,
          currency.decimalPlace,
          currency.lowestDenomination
        ).round(),
      },
      {
        type: invoiceComponentType.SUBTOTAL,
        value: new KD(
          orderSet.subtotal,
          currency.decimalPlace,
          currency.lowestDenomination
        ).round(),
      },
      // { type: invoiceComponentType.AMOUNT_DUE, value: amountDue },
    ];
    amountPaid += Number(orderSet.subtotal || 0);
    const paymentStatus = await this.context.paymentStatus.getAllByOrderSetId(
      orderSet.id
    );

    let amountDue = orderSet.amountDue;
    if (paymentStatus) {
      const currentPaymentStatus = paymentStatus[0];
      if (currentPaymentStatus.name === paymentStatusName.PAYMENT_SUCCESS) {
        amountDue = 0;
      }
    }

    components.push({
      type: invoiceComponentType.AMOUNT_DUE,
      value: new KD(
        amountDue,
        currency.decimalPlace,
        currency.lowestDenomination
      ).round(),
    });
    amountPaid -= Number(amountDue || 0);

    const consumedPerks = await this.context.customerUsedPerk.getByOrderSetId(
      orderSet.id
    );

    const consumedCouponPerks = await this.context.usedCouponDetail.getAllUsedOn(
      couponDetailUsedOn.ORDER_SET,
      orderSet.id
    );

    const feeDeliveryPerk = find(
      consumedPerks,
      cp => cp.type === rewardTierPerkType.FREE_DELIVERY
    );

    const couponFeeDeliveryPerk = find(
      consumedCouponPerks,
      cp => cp.type === couponType.FREE_DELIVERY
    );

    if (
      parseFloat(orderSet.fee) > 0 ||
      (feeDeliveryPerk && parseFloat(feeDeliveryPerk.total) > 0) ||
      (couponFeeDeliveryPerk && parseFloat(couponFeeDeliveryPerk.amount) > 0)
    ) {
      components.push({
        type: invoiceComponentType.SERVICE_FEE,
        value: new KD(
          orderSet.fee,
          currency.decimalPlace,
          currency.lowestDenomination
        ).round(),
      });
      amountPaid += Number(orderSet.fee || 0);
    }

    if (parseFloat(orderSet.couponAmount) > 0 || orderSet.couponId) {
      const coupon = await this.context.coupon.getById(orderSet.couponId);
      let tempType;

      if (coupon) {
        if (coupon.referralCoupon) {
          tempType = invoiceComponentType.REFERRAL;
        } else if (coupon.type === promoType.CASHBACK) {
          tempType = invoiceComponentType.CASHBACK;
        } else {
          tempType = invoiceComponentType.VOUCHER;
          amountPaid -= Number(orderSet.couponAmount || 0);
        }

        components.push({
          type: tempType,
          value: new KD(
            orderSet.couponAmount,
            currency.decimalPlace,
            currency.lowestDenomination
          ).round(),
        });
      }
    }

    let rewardAmount = 0;
    // for new orders we are saving reward amount (free food/drink + discount) in orderSet object
    if (orderSet.rewardAmount === null) {
      let rewardPerkFreeAmount = await this.context.orderItem.rewardPerkFreeAmount(
        orderSet.id
      );
      if (rewardPerkFreeAmount) {
        rewardPerkFreeAmount = parseFloat(rewardPerkFreeAmount.freefooddrink);
      }

      const rewardDiscountPerk = find(
        consumedPerks,
        cp => cp.type === rewardTierPerkType.DISCOUNT
      );
      rewardAmount = rewardPerkFreeAmount;
      if (rewardDiscountPerk && parseFloat(rewardDiscountPerk.total) > 0) {
        rewardAmount +=
          (parseFloat(orderSet.subtotal) - rewardPerkFreeAmount) *
          (rewardDiscountPerk.total / 100);
      }
    } else {
      rewardAmount = parseFloat(orderSet.rewardAmount);
    }

    if (parseFloat(rewardAmount) > 0) {
      components.push({
        type: invoiceComponentType.REWARD_DISCOUNT,
        value: new KD(
          rewardAmount,
          currency.decimalPlace,
          currency.lowestDenomination
        ).round(),
      });
      amountPaid -= Number(rewardAmount || 0);
    }

    const prePaid = orderSet.prePaid;
    let debitedForOrderId = 0;
    let giftCardDebited = 0;
    let discoveryCreditDebited = 0;
    let subscriptionDebited = 0;
    let isSubscriptionAvailable = false;
    let subscriptionDetails = null;
    if (prePaid) {
      if (prePaid.creditsUsed && Number(prePaid.creditsUsed) > 0) {
        debitedForOrderId = Number(prePaid.creditsUsed) || 0;
      }
      if (prePaid.giftCards && prePaid.giftCards.length > 0) {
        giftCardDebited = Number(prePaid.giftCards[0].value) || 0;
      }
      if (
        prePaid.discoveryCreditUsed &&
        Number(prePaid.discoveryCreditUsed) > 0
      ) {
        discoveryCreditDebited = Number(prePaid.discoveryCreditUsed) || 0;
      }
      if (
        prePaid.subscription
      ) {
        const subscriptionValue = prePaid.subscription.reduce((a, b) => a += b.value, 0);
        isSubscriptionAvailable = true;
        subscriptionDetails = map(groupBy(prePaid.subscription, 'id'), (subs, id) => {
          return {
            id,
            value: sumBy(subs, 'value'),
            usedCupsCount: sumBy(subs, 'usedCupsCount')
          };
        });
        subscriptionDebited = Number(subscriptionValue) || 0;
      }
    }

    if (debitedForOrderId <= 0) {
      debitedForOrderId = await this.context.loyaltyTransaction.debitedForOrderId(
        orderSet.id
      );
    }

    if (
      orderSet.creditsUsed ||
      (debitedForOrderId && Number(debitedForOrderId) > 0)
    ) {
      components.push({
        type: invoiceComponentType.CREDITS,
        value: new KD(
          Number(debitedForOrderId),
          currency.decimalPlace,
          currency.lowestDenomination
        ).round(),
      });
    }
    if (discoveryCreditDebited && Number(discoveryCreditDebited) > 0) {
      components.push({
        type: invoiceComponentType.DISCOVERY_CREDITS,
        value: new KD(
          Number(discoveryCreditDebited),
          currency.decimalPlace,
          currency.lowestDenomination
        ).round(),
      });
      amountPaid -= Number(discoveryCreditDebited || 0);
    }


    if (subscriptionDebited && Number(subscriptionDebited) > 0) {
      components.push({
        type: invoiceComponentType.SUBSCRIPTION_DISCOUNT,
        value: new KD(
          Number(subscriptionDebited),
          currency.decimalPlace,
          currency.lowestDenomination
        ).round(),
      });
      amountPaid -= Number(subscriptionDebited || 0);
    }

    if (giftCardDebited <= 0) {
      giftCardDebited = await this.context.giftCardTransaction.debitedForOrderId(
        orderSet.id
      );
    }

    // const
    if (giftCardDebited && Number(giftCardDebited) > 0) {
      components.push({
        type: invoiceComponentType.GIFT_CARD,
        value: new KD(
          Number(giftCardDebited),
          currency.decimalPlace,
          currency.lowestDenomination
        ).round(),
      });
      amountPaid -= Number(giftCardDebited || 0);
    }

    components.push({
      type: invoiceComponentType.AMOUNT_PAID,
      value: new KD(
        Number(amountPaid || 0) > 0 ? Number(amountPaid) : 0,
        currency.decimalPlace,
        currency.lowestDenomination
      ).round(),
    });
    // console.log('components', components);

    const beans = await this.context.rewardPointsTransaction.getOrderPoints(
      orderSetId
    );

    return {
      components,
      currency: currency ? addLocalizationField(currency, 'symbol') : null,
      isSubscriptionAvailable,
      subscriptionDetails,
      beans,
      // vat: orderSet.vat,
      // totalVat: orderSet.totalVat,
    };
  }

  // eslint-disable-next-line max-params
  // @TODO: CHECK THIS REVEL!!!
  async sendRevelOrder(items, orderSet, payedFor, delivery, check) {
    try {
      const brand = await this.context.brand.getByBrandLocation(
        orderSet.brandLocationId
      );
      if (brand && brand.isPos) {
        const Revel = require('../../lib/revel');
        const revel = new Revel(brand.posUrl, brand.posKey, brand.posSecret);
        const estId = brand.posId;
        const customer = await this.context.customer.getById(
          orderSet.customerId
        );

        const revelItems = await Promise.all(
          items.map(it => {
            return new Promise(async success => {
              const options = await Promise.all(
                it.selectedOptions.map(o =>
                  this.context.menuItemOption.getById(o.optionId || o.id)
                )
              );

              const product = options.find(
                o => o.posId.indexOf('/resources/Product/') !== -1
              );

              const revelModifiers = options
                .filter(o => o.posId.indexOf('/resources/Product/') === -1)
                .map(m => {
                  return {
                    modifier: m.posId
                      .split('resources/Modifier/')[1]
                      .split('/')[0],
                    modifier_price: parseFloat(m.price),
                    qty: 1,
                    qty_type: 0,
                  };
                });
              success({
                modifieritems: revelModifiers,
                price: parseFloat(product.price),
                product: product.posId
                  .split('/resources/Product/')[1]
                  .split('/')[0],
                quantity: it.quantity,
              });
            });
          })
        );

        const orderData = {
          establishment: estId,
          items: revelItems,
          orderInfo: {
            created_date: revel.getCurrentDate(),
            pickup_time: revel.getCurrentDate(),
            dining_option: 0,
            notes: orderSet.note,
            asap: true,
            customer: {
              phone: customer.phoneNumber,
              email: customer.email,
              first_name: customer.firstName,
              last_name: customer.lastName,
            },
          },
          paymentInfo: {
            tip: 0,
            amount: revelItems.reduce((a, v) => {
              a +=
                v.price +
                v.modifieritems.reduce((ma, mv) => {
                  ma += mv.price;
                  return ma;
                }, 0);
              return a;
            }, 0),
            type: payedFor ? 7 : 4,
          },
        };

        if (payedFor) {
          orderData.paymentInfo.transaction_id = uuid.get();
          orderData.paymentInfo.cardInfo = {
            cardNumber: 'xxxxxxxxxxxxxxxxx',
            firstDigits: 'xxxx',
            lastDigits: 'xxxx',
            firstName: customer.firstName,
            lastName: customer.lastName,
          };
        }
        if (delivery) {
          const coordonates = (await this.context.db.raw(`SELECT
          st_y('${delivery.geolocation}') as latitude,
          st_x('${delivery.geolocation}') as longitude`)).rows[0];
          const neighborhood = await this.context.neighborhooted.getById(
            delivery.neighborhoodId
          );
          const city = await this.context.city.getById(neighborhood.cityId);
          const country = await this.context.country.getById(city.countryId);

          const { getExtraFields } = require('../customer/utils');
          const extraFields = await getExtraFields(
            addLocalizationField(
              await this.context
                .db('customer_addresses_fields')
                .join(
                  'countries',
                  'customer_addresses_fields.country_id',
                  'countries.id'
                )
                .select('customer_addresses_fields.*')
                .where('iso_code', country.isoCode)
                .orderBy('order', 'asc')
                .then(transformToCamelCase),
              'title'
            ),
            delivery.dynamicData
          );

          orderData.orderInfo.dining_option = 2;
          orderData.orderInfo.customer.address = {
            country: country.isoCode,
            longitude: coordonates.longitude,
            latitude: coordonates.latitude,
            city: city.name,
            street_1: extraFields
              .sort((a, b) => a.order - b.order)
              .map(it => `${it.name.en}:${it.value}`)
              .join(', '),
          };
        }

        const rss = await revel.createData(
          `/specialresources/cart/${check ? 'validate' : 'submit'}/`,
          orderData
        );
        if (rss.status === 'OK') {
          if (!check) return rss.orderId;
          return true;
        }
        return false;
      }
      return null;
    } catch (err) {
      // console.log(err);
      return false;
    }
  }
  // TODO: CHECK THIS REVEL!!!
  async getAddress({ fulfillment }) {
    // let deliveryAddress;

    // if (fulfillment.type === orderFulfillmentTypes.AIRPORT) {
    //   deliveryAddress = {
    //     type: customerAddressType.AIRPORT,
    //   };
    // } else {
    const customerAddress = await this.context.customerAddress.getById(
      fulfillment.id
    );

    const neighborhood = await this.context.neighborhood.getById(
      get(customerAddress, 'neighborhoodId')
    );

    const fieldsFromCustomerAddress = pick(customerAddress, [
      'geolocation',
      'note',
      'friendlyName',
      'block',
      'street',
      'avenue',
      'streetNumber',
      'type',
      'floor',
      'unitNumber',
      'city',
      'countryCode',
      'dynamicData',
    ]);

    const deliveryAddress = {
      ...fieldsFromCustomerAddress,
      neighborhoodName: neighborhood ? neighborhood.name : null,
      neighborhoodId: neighborhood ? neighborhood.id : null,
    };
    // }
    return deliveryAddress;
  }

  // Validations
  async validate(orderSet) {
    const errors = [];
    const isValid = await this.isValid(orderSet);

    if (!isValid) {
      errors.push(orderSetError.INVALID_ORDER_SET);
    }

    const orderSetInternalNoteLength = get(orderSet, 'internalNote.length', 0);

    if (orderSetInternalNoteLength > 4096) {
      errors.push(orderSetError.NOTE_MAX_LENGTH_EXCEEDED);
    }

    return errors;
  }

  async creditTransaction(
    context,
    { orderSetId, paymentStatusOrderType, customerId, amount, currencyId }
  ) {
    await context.loyaltyTransaction.credit(
      orderSetId,
      paymentStatusOrderType,
      customerId,
      Number(amount),
      currencyId
    );
  }

  async addCashback(orderSetId) {
    const orderSet = await this.getById(orderSetId);
    // checklist
    // - payment is succussful
    // - coupon is appied.
    // - coupon is cashback
    // - credit back the coupon amount as cashback
    if (orderSet && orderSet.isCashbackCoupon && orderSet.couponAmount > 0) {
      await this.creditTransaction(this.context, {
        orderSetId,
        paymentStatusOrderType: loyaltyTransactionType.CASHBACK,
        customerId: orderSet.customerId,
        amount: orderSet.couponAmount,
        currencyId: orderSet.currencyId,
      });
    }
  }

  async paidWithCash(orderSetId, wasPaid) {
    const orderSet = await this.getById(orderSetId);
    const context = this.context;
    if (wasPaid) {
      const brandLocation = await this.context.brandLocation.getById(
        orderSet.brandLocationId
      );

      await Promise.all([
        this.context.orderSetStatus.setStatusForOrderSetId(
          orderSetId,
          orderSetStatusNames.COMPLETED,
          context
        ),
        this.save({ id: orderSet.id, paid: true, amountDue: 0.0 }),
        // TODO: this orderSet -> paymentStatus -> orderSet ricochet needs untangling
        this.context.paymentStatus.save({
          referenceOrderId: orderSetId,
          orderType: paymentStatusOrderType.ORDER_SET,
          name: paymentStatusName.PAYMENT_SUCCESS,
          rawResponse: '{"isCash": true, "paid": true}',
          isCashPayment: true,
        }),
        this.addCashback(orderSetId),
        // Commented: we don't need to increment number of orders for customer
        // because we kind of already did at the time of order placement.
        // this.context.customerStats.increment(orderSet.customerId, {
        //   totalOrders: 1,
        //   totalKdSpent: Number(orderSet.total),
        // }),
        this.context.transaction.save({
          referenceOrderId: orderSetId,
          orderType: paymentStatusOrderType.ORDER_SET,
          action: transactionAction.ORDER,
          type: transactionType.DEBITED,
          customerId: orderSet.customerId,
          currencyId: brandLocation.currencyId,
          amount: orderSet.amountDue,
        }),
      ]);
    } else {
      // WARNING this reverses a cash payment and it also decrements
      // the customer stats. This should never be called unless the
      // previous status was paid.
      await Promise.all([
        this.context.orderSetStatus.setStatusForOrderSetId(
          orderSetId,
          orderSetStatusNames.REJECTED,
          context
        ),
        this.context.paymentStatus.save({
          referenceOrderId: orderSetId,
          orderType: paymentStatusOrderType.ORDER_SET,
          name: paymentStatusName.PAYMENT_FAILURE,
        }),
        this.context.customerStats.increment(orderSet.customerId, {
          totalOrders: -1,
          totalKdSpent: -Number(orderSet.total),
        }),
      ]);
    }
  }

  async incrementCouponCountersForOrderSet(orderSetId, increment = 1) {
    const orderSet = await this.getById(orderSetId);

    const { couponId, customerId } = orderSet;

    if (couponId !== null && couponId !== undefined) {
      // We have a Coupon. Increment Usage on customers_coupons and coupons
      await this.context.coupon.incrementCouponCountersForCustomer(
        couponId,
        customerId,
        increment
      );
    }
  }
  /**
  Determines the appropriate notifications that must be sent in response to a payment status change. Broken out into a separate function for testability.
  @param {String} orderSetId The associated order set id.
  @param {String} statusName The payment status name, e.g. "PAYMENT_SUCCESS"
  @return {Object} An object with three arrays: push, sms, and email. Each array contains objects that can be passed to the pushCreate, smsCreate, and emailCreate functions in notifications.js
  Developers should not use this function directly, but rather the associated function called `sendPaymentStatusChangeNotifications()`.
  */
  async paymentStatusChangeNotifications(
    orderSetId,
    paymentStatusName,
    knetResponse,
    context
  ) {
    let sendNotfication = true;
    const emptySet = { push: [], email: [] };

    const knetResponseValues = jsonToObject(knetResponse);
    const isCash = get(knetResponseValues, 'isCash', false);
    const paid = get(knetResponseValues, 'paid', false);
    // we wont send if payment is not successful
    if (paymentStatusName !== 'PAYMENT_SUCCESS') {
      sendNotfication = false;
    }
    // but send if the order is paid by cash. at the time when its placed and when its completed.
    if (isCash && !paid) {
      sendNotfication = true;
    } else if (isCash && paid) {
      sendNotfication = false;
    }

    if (!sendNotfication) {
      return Promise.resolve(emptySet);
    }

    const rendering = await renderConfirmationEmail(
      context,
      orderSetId,
      paymentStatusName,
      knetResponse
    );
    if (!rendering) {
      return Promise.resolve(emptySet);
    }
    const emailArgs = Object.assign(
      {
        sender: receipts,
        notificationCategory: notificationCategories.ORDER_CONFIRMATION,
      },
      rendering
    );
    const result = {
      push: [],
      email: [emailArgs],
    };
    return Promise.resolve(result);
  }

  /**
  Sends customer notifications indicated by the payment status change.
  */
  async sendPaymentStatusChangeNotifications(
    orderSetId,
    paymentStatusName,
    knetResponse
  ) {
    const notifications = await this.paymentStatusChangeNotifications(
      orderSetId,
      paymentStatusName,
      knetResponse,
      this.context
    );
    return this.context.notification.createAllIn(notifications);
  }

  async defaultReport(stream, startDate, endDate) {
    const dates = [startDate || '1970-01-01', endDate || '2200-01-01'];

    const query = `
SELECT
  o.short_code,
  o.created_at,
  o.total AS total_kd,
  o.subtotal,
  o.fee,
  o.cash_on_delivery,
  o.credits_used,
  c.first_name,
  c.last_name,
  cou.code AS coupon_code,
  cou.flat_amount AS coupon_amount,
  cou.percentage AS coupon_percentage,
  os.status,
  of.type,
  of.time as fulfillment_time,
  of.asap,
  b.name AS brand_name,
  bla.short_address,
  da.neighborhood_name AS delivery_neighborhood,
  (SELECT SUM(quantity) FROM order_items oi WHERE oi.order_set_id = o.id) AS item_count
FROM order_sets AS o
JOIN customers AS c ON c.id = o.customer_id
JOIN order_set_statuses AS os ON os.id = (
       SELECT id FROM order_set_statuses
       WHERE order_set_statuses.order_set_id = o.id
       ORDER BY created_at DESC LIMIT 1
    )
-- order sets are not 'sets', the order table is a useless pass-through
-- JOIN orders ON orders.order_set_id = o.id
JOIN order_fulfillment AS of ON of.order_set_id = o.id
LEFT JOIN delivery_addresses AS da ON da.order_fulfillment_id = of.id
JOIN brand_locations AS bl ON bl.id = o.brand_location_id
JOIN brand_location_addresses AS bla ON bl.id = bla.brand_location_id
-- LEFT JOIN neighborhoods AS brand_hood ON brand_hood.id = bln.neighborhood_id
LEFT JOIN coupons as cou ON cou.id = o.coupon_id
JOIN brands AS b ON b.id = bl.brand_id

WHERE
  o.created_at > ? AND o.created_at < ?

ORDER BY o.created_at DESC
`;

    return this.roDb
      .raw(query, dates)
      .stream(s => s.pipe(new ReportFormatter()).pipe(stream))
      .catch(console.error);
  }

  async isBeingFulfilled(orderSetId) {
    /*
      isBeingFulfilled would be set to TRUE if the Order's status is ACCEPTED and the Fulfillment Date is today.
      All Pickup and ASAP Delivery Orders would have this flag set to true, since they can only be placed for the same day.
      Only Scheduled deliveries for dates in the future would be set to false.
    */
    const [currentOrderSetStatus, currentOrderFulfilment] = await Promise.all([
      this.context.orderSetStatus.getLatestByOrderSet(orderSetId),
      this.context.orderFulfillment.getByOrderSet(orderSetId),
    ]);

    if (currentOrderSetStatus.status !== orderSetStatusNames.ACCEPTED) {
      return false;
    }

    if (currentOrderFulfilment.type === 'PICKUP') {
      return true;
    }

    if (
      currentOrderFulfilment.type === 'DELIVERY' &&
      currentOrderFulfilment.asap
    ) {
      return true;
    }

    return (
      moment()
        .tz(timezone)
        .format('YYYY-MM-DD') ===
      moment(currentOrderFulfilment.time)
        .tz(timezone)
        .format('YYYY-MM-DD')
    );
  }

  async debitAndProcessPayment(order, paymentStatus, rawResponse) {
    const [
      currentPaymentStatus,
    ] = await this.context.paymentStatus.getAllByOrderSetId(order.id);
    const newPaymentStatus = {
      referenceOrderId: order.id,
      orderType: paymentStatusOrderType.ORDER_SET,
      name: paymentStatus,
      rawResponse: JSON.stringify(rawResponse),
    };
    if (paymentStatus === paymentStatusName.PAYMENT_SUCCESS) {
      if (paymentStatus === currentPaymentStatus.name) {
        console.log(
          `${paymentStatusName.PAYMENT_SUCCESS} already processed for ${order.id}`
        );
      } else {
        const prePaid = order.prePaid;

        if (prePaid) {
          // if credits are used
          prePaid.creditsUsed = prePaid.creditsUsed || 0;
          prePaid.discoveryCreditUsed = prePaid.discoveryCreditUsed || 0;
          prePaid.giftCards = prePaid.giftCards || [];
          prePaid.subscription = prePaid.subscription || null;
          if (prePaid.subscription) {
            const country = await this.context.country.getByCurrencyId(order.currencyId);
            const brandLocation = await this.context.brandLocation.getById(order.brandLocationId);
            await this.context.cSubscriptionCustomerTransaction.debitSubscription(
              prePaid.subscription,
              order.customerId,
              order.id,
              order.currencyId,
              country.id,
              order.brandLocationId,
              brandLocation.brandId);
          }
          if (Number(prePaid.creditsUsed) > 0) {
            await this.context.loyaltyTransaction.debit(
              order.id,
              paymentStatusOrderType.ORDER_SET,
              order.customerId,
              Number(prePaid.creditsUsed),
              order.currencyId
            );
          }
          if (Number(prePaid.discoveryCreditUsed) > 0) {
            await this.context.loyaltyTransaction.debit(
              order.id,
              loyaltyTransactionType.DISCOVERY_CREDITS,
              order.customerId,
              Number(prePaid.discoveryCreditUsed),
              order.currencyId
            );
          }
          // if gift card was used
          if (prePaid.giftCards.length > 0) {
            await this.context.giftCardTransaction.debit({
              giftCardId: prePaid.giftCards[0].id,
              referenceOrderId: order.id,
              orderType: paymentStatusOrderType.ORDER_SET,
              customerId: order.customerId,
              amount: Number(prePaid.giftCards[0].value),
              currencyId: order.currencyId,
            });
          }
        }

        // add cashback
        await this.addCashback(order.id);

        const orderSetInput = {
          id: order.id,
          paid: true,
          amountDue: 0.0,
        };

        const delivery = await this.context.deliveryAddress.getByOrderFulfillmentId(
          (await this.context.orderFulfillment.getByOrderSet(order.id)).id
        );

        const posOrderId = await this.sendRevelOrder(
          await Promise.all(
            (await this.context.orderItem.getByOrderSetId(order.id)).map(
              it =>
                new Promise(async success => {
                  const options = (await this.context.orderItemOption.getAllForOrderItemId(
                    it.id
                  )).map(o => {
                    return {
                      id: o.menuItemOptionId,
                    };
                  });
                  success({ ...it, selectedOptions: options });
                })
            )
          ),
          order,
          true,
          delivery,
          false
        );
        if (posOrderId) {
          orderSetInput.posOrderId = posOrderId;
        }

        await this.save(orderSetInput);

        // Update Customer Stats
        await this.context.customerStats.increment(order.customerId, {
          totalOrders: 1,
          totalKdSpent: order.total,
        });
        // add payment transaction
        await this.context.transaction.save({
          referenceOrderId: order.id,
          action: transactionAction.ORDER,
          orderType: paymentStatusOrderType.ORDER_SET,
          type: transactionType.DEBITED,
          customerId: order.customerId,
          currencyId: order.currencyId,
          amount: order.total,
        });
        // if order is already processed transaction have to fail
        // with this insert
        await this.db('successful_payment_transactions').insert({
          referenceOrderId: order.id
        });

        await this.context.paymentStatus.save(newPaymentStatus);
        return true;
      }
    } else {
      await this.context.paymentStatus.save(newPaymentStatus);
    }
    return false;
  }

  async resolvePaymentCallback(psResponse) {
    const { referenceOrderId, paymentStatus, rawResponse } = psResponse;
    const order = await this.getById(referenceOrderId);
    if (!order) {
      return formatError([`order ${referenceOrderId} not found`]);
    }
    // testing
    // paymentStatus = paymentStatusName.PAYMENT_SUCCESS;
    this.context.withTransaction(
      'orderSet',
      'debitAndProcessPayment',
      order,
      paymentStatus,
      rawResponse
    ).then(result => {
      if (result) {
        publishSubscriptionEvent(
          this.context,
          order.id,
          orderSetSubscriptionEvent.ORDER_SET_CREATED
        );
      }
    }).catch(err => {
      const errObj = {
        psResponse,
        err: err?.message,
      };
      this.context.kinesisLogger.sendLogEvent(errObj, 'resolvePaymentCallback-error');
    });
    return {
      redirect:
        paymentStatus === paymentStatusName.PAYMENT_SUCCESS
          ? order.receiptUrl
          : order.errorUrl,
      trackid: order.id,
      paymentMethod: order.paymentMethod,
    };
  }

  getCustomerFirstCompletedOrder(customerId) {
    return this.db
      .select('*')
      .from('order_sets')
      .where('customer_id', customerId)
      .andWhereRaw(
        `(current_status = '${orderSetStatusNames.COMPLETED}'::order_set_statuses_enum)`
      )
      .orderBy('created_at', 'ASC')
      .limit(1)
      .then(transformToCamelCase)
      .then(first);
  }

  // ===================

  async orderCreate(input) {
    // await this.checkForCreditLock(input);
    // await this.checkForGiftCardLock(input);

    const validationErrors = await validateOrder(this.context)({
      ...input,
      ...{ invoice: false },
    });
    if (validationErrors.length > 0) {
      await this.context.kinesisLogger.sendLogEvent(
        { input, validationErrors },
        kinesisEventTypes.orderValidateError
      );
      return formatErrorResponse(validationErrors);
    }

    return createOrder(this.context)(input);
  }

  async createOrder(input) {
    const computeInvoice = new ComputeInvoice(this.context, {
      ...input,
      invoice: false,
    });
    try {
      await computeInvoice.init();
      await computeInvoice.validateOrder();
    } catch (err) {
      if (
        Array.isArray(err) &&
        err.includes(orderCreateError.ORDER_ALREADY_PROCESSED)
      ) {
        return computeInvoice.cacheResult;
      }
      this.context.kinesisLogger.sendLogEvent(
        { input, err },
        kinesisEventTypes.orderValidateError
      );
      return formatErrorResponse(err);
    }
    return computeInvoice.createOrder();
  }

  async computeInvoice(input) {
    const validationErrors = await validateOrder(this.context)({
      ...input,
      ...{ invoice: true },
    });

    if (validationErrors.length > 0) {
      return formatErrorResponse(validationErrors);
    }

    return computeInvoice(this.context)(input);
  }

  async getInvoice(input) {
    const computeInvoice = new ComputeInvoice(this.context, {
      ...input,
      invoice: true,
    });
    try {
      await computeInvoice.init();
      await computeInvoice.validateOrder();
      return await computeInvoice.getInvoice();
    } catch (err) {
      return formatErrorResponse(err);
    }
  }

  async orderSetRefund(orderSetId, reason) {
    await orderSetRefund(this.context)(
      orderSetId,
      loyaltyTransactionType.ORDER_SET_REFUND,
      reason
    );
  }

  async validateOrderSetRefund(referenceOrderId) {
    const result = await validateOrderSetRefund(this.context)(referenceOrderId);
    return result;
  }

  getOrderSetListTotalItemCountForLiteView(params) {
    const query = this.roDb(this.viewName).select(
      this.roDb.raw('count(*) as total_items')
    );
    return this.addFilterOrderSetLiteQuery({
      query,
      filters: params,
    }).then(first);
  }

  getOrderSetListFromLiteView(params) {
    const query = this.roDb(this.viewName)
      .select('*')
      .orderBy('created_at', 'desc');

    const { limit = 25, offset = 0 } = params.paging;
    query.limit(limit).offset(offset);

    return this.addFilterOrderSetLiteQuery({ query, filters: params });
  }

  async addFilterOrderSetLiteQuery({ query, filters }) {
    const {
      searchTerm,
      filterType,
      filterTypes,
      dateRange,
      brandLocationId,
      brandId,
      countryId,
      fulfillmentType,
    } = filters;
    const startDate = get(dateRange, 'startDate');
    const endDate = get(dateRange, 'endDate');

    let timeZoneIdentifier = null;
    if (countryId) {
      const country = await this.context.country.getById(countryId);
      timeZoneIdentifier = country?.timeZoneIdentifier;
    }

    if (startDate) {
      query.where('created_at', '>=', toDateWithTZ(startDate, 'start', timeZoneIdentifier));
    }

    if (endDate) {
      query.where('created_at', '<=', toDateWithTZ(endDate, 'end', timeZoneIdentifier));
    }

    if (searchTerm) {
      // TODO: Change full text search mechanism
      // (Elasticsearch or maybe https://www.postgresql.org/docs/current/textsearch-tables.html)
      query.where(query => {
        query.whereRaw(`
            short_code ilike '%${searchTerm}%' OR
            brand_name ilike '%${searchTerm}%' OR
            branch_name ilike '%${searchTerm}%' OR
            customer_id ilike '%${searchTerm}%' OR
            customer_first_name ilike '%${searchTerm}%' OR
            customer_last_name ilike '%${searchTerm}%' OR
            customer_email ilike '%${searchTerm}%' OR
            customer_phone_number ilike '%${searchTerm}%'
          `);
      });
    }
    if (filterType) {
      query.andWhere('current_status', filterType);
    }
    if (filterTypes) {
      query.whereIn('current_status', filterTypes);
    }
    if (brandLocationId) {
      query.where('brand_location_id', brandLocationId);
    }
    if (brandId) {
      query.where('brand_id', brandId);
    }
    if (countryId) {
      query.where('country_id', countryId);
    }
    if (fulfillmentType) {
      query.where('fulfillment_type', fulfillmentType);
    }
    return query;
  }

  getDelayedOrderSetListFromLiteView(params) {
    const deliveryDelayWindow = 25;
    const nondeliveryDelayWindow = 10;
    const query = this.roDb(this.viewName)
      .select('*')
      .whereRaw(
        `
        (current_status != '${orderSetStatusNames.COMPLETED}'
        and current_status != '${orderSetStatusNames.REPORTED}'
        and current_status != '${orderSetStatusNames.REJECTED}')
      `
      )
      .andWhere(function () {
        return this.where(query =>
          query
            .where('fulfillment_type', fulfillmentTypeEnum.DELIVERY)
            .andWhereRaw(
              `created_at < now() - INTERVAL '${deliveryDelayWindow} min'`
            )
        ).orWhere(query =>
          query
            .where('fulfillment_type', '!=', fulfillmentTypeEnum.DELIVERY)
            .andWhereRaw(
              `created_at < now() - INTERVAL '${nondeliveryDelayWindow} min'`
            )
        );
      })
      .orderBy('created_at', 'desc');
    const { limit = 25, offset = 0 } = params.paging;
    query.limit(limit).offset(offset);
    return this.addFilterOrderSetLiteQuery({ query, filters: params });
  }

  getDelayedOrderSetListTotalItemCountForLiteView(params) {
    const deliveryDelayWindow = 25;
    const nondeliveryDelayWindow = 10;
    const query = this.roDb(this.viewName)
      .select(this.roDb.raw('count(*) as total_items'))
      .whereRaw(
        `
        (current_status != '${orderSetStatusNames.COMPLETED}'
        and current_status != '${orderSetStatusNames.REPORTED}'
        and current_status != '${orderSetStatusNames.REJECTED}')
      `
      )
      .andWhere(function () {
        return this.where(query =>
          query
            .where('fulfillment_type', fulfillmentTypeEnum.DELIVERY)
            .andWhereRaw(
              `created_at < now() - INTERVAL '${deliveryDelayWindow} min'`
            )
        ).orWhere(query =>
          query
            .where('fulfillment_type', '!=', fulfillmentTypeEnum.DELIVERY)
            .andWhereRaw(
              `created_at < now() - INTERVAL '${nondeliveryDelayWindow} min'`
            )
        );
      });
    return this.addFilterOrderSetLiteQuery({
      query,
      filters: params,
    }).then(first);
  }

  async getNewOrderSetsByBrandLocation(brandLocationId, limit, page) {
    // const startDate = moment().startOf('day');

    const query = this.roDb
      .from('order_sets as os')
      .join('customers as c', 'c.id', 'os.customer_id')
      .join('order_fulfillment as of', 'of.order_set_id', 'os.id')
      .leftJoin('order_set_arriving_times as osat', 'osat.order_set_id', 'os.id')
      .where('os.brand_location_id', brandLocationId)
      .andWhereRaw(`os.current_status = '${orderSetStatusNames.PLACED}'::order_set_statuses_enum`)
      .andWhereRaw('( os.payment_method = \'CASH\' OR ((os.payment_method <> \'CASH\' OR os.payment_method is null) AND os.paid = \'TRUE\' ))')
      .andWhereRaw('os.created_at >= (now() - INTERVAL \'1 day\')');
    //.andWhere('os.created_at', '>=', toDateWithTZ(startDate, 'start'));


    const totalCount = (await query.clone().count())[0].count;
    query.select(
      this.roDb.raw(
        'os.id, os.brand_location_id, os.short_code, os.created_at, os.customer_id, os.current_status, c.phone_number, of.type, osat.arrival_time'
      )
    ).orderBy('os.created_at', 'asc');

    if (limit && page) {
      query.offset((page - 1) * limit).limit(limit);
    }
    const orders = await query;
    return {
      pagination: {
        totalRecords: +totalCount,
        totalPage: limit ? (~~(totalCount / limit) + (totalCount % limit === 0 ? 0 : 1)) : (+totalCount == 0 ? 0 : 1),
        page: page ? page : (+totalCount == 0 ? 0 : 1),
        limit: limit ? limit : +totalCount
      },
      orders
    };
  }

  async getPastOrderSetsByBrandLocation(brandLocationId, limit, page, shortCode) {
    //const startDate = moment().startOf('day');

    const query = this.roDb
      .from('order_sets as os')
      .join('customers as c', 'c.id', 'os.customer_id')
      .join('order_fulfillment as of', 'of.order_set_id', 'os.id')
      .andWhere('os.brand_location_id', brandLocationId)
      .andWhereRaw(
        `(current_status <> '${orderSetStatusNames.INITIATED}'::order_set_statuses_enum AND
          current_status <> '${orderSetStatusNames.PLACED}'::order_set_statuses_enum AND
          current_status <> '${orderSetStatusNames.PAYMENT_CANCELED}'::order_set_statuses_enum AND
          current_status <> '${orderSetStatusNames.PAYMENT_FAILURE}'::order_set_statuses_enum AND
          current_status IS NOT NULL
        )`
      )
      .andWhereRaw('os.created_at >= (now() - INTERVAL \'1 day\')');
    // .andWhere('os.created_at', '>=', toDateWithTZ(startDate, 'start'));

    if (shortCode) {
      query.whereRaw(`short_code LIKE '%${shortCode.toUpperCase()}%' `);
    }
    const totalCount = (await query.clone().count())[0].count;
    query.select(
      this.roDb.raw(
        'os.id, os.brand_location_id, os.short_code, os.created_at, os.customer_id, os.current_status, c.phone_number, of.type'
      )
    ).orderBy('os.created_at', 'desc');
    if (limit && page) {
      query.offset((page - 1) * limit).limit(limit);
    }
    const orders = await query;
    return {
      pagination: {
        totalRecords: +totalCount,
        totalPage: limit ? (~~(totalCount / limit) + (totalCount % limit === 0 ? 0 : 1)) : (+totalCount == 0 ? 0 : 1),
        page: page ? page : (+totalCount == 0 ? 0 : 1),
        limit: limit ? limit : +totalCount
      },
      orders
    };
  }

  async getOrderDetailWithBrandLocation(brandLocationId, orderSetId) {
    let order = await this.roDb
      .select(
        this.roDb.raw(
          `os.id, os.brand_location_id, bl.brand_id, b.only_show_subtotal_for_mpos, os.currency_id, os.short_code, os.payment_method, os.created_at, os.customer_id,
          os.current_status, os.note, c.first_name, c.last_name, c.phone_number, os.coupon_id,
          of.type as fulfillment_type, of.id as fulfillment_id, of.courier_name, of.vehicle_description,
          of.vehicle_color, of.vehicle_plate_number, of.deliver_to_vehicle, osat.arrival_time, osat.arrived as customer_arrived`
        )
      )
      .from('order_sets as os')
      .join('customers as c', 'c.id', 'os.customer_id')
      .join('order_fulfillment as of', 'of.order_set_id', 'os.id')
      .leftJoin('brand_locations as bl', 'os.brand_location_id', 'bl.id')
      .leftJoin('brands as b', 'bl.brand_id', 'b.id')
      .leftJoin('order_set_arriving_times as osat', 'osat.order_set_id', 'os.id')
      .andWhere('os.brand_location_id', brandLocationId)
      .andWhere('os.id', orderSetId)
      .andWhereRaw('os.created_at >= (now() - INTERVAL \'1 day\')')
      .then(first);

    if (!order) return null;
    // Added invoice info
    const invoice = await this.getInvoiceByOrderSetId(order.id);
    if (order.onlyShowSubtotalForMpos) {
      const subtotal = invoice.components.find(component => component.type == invoiceComponentType.SUBTOTAL);
      const amountDue = invoice.components.find(component => component.type == invoiceComponentType.AMOUNT_DUE);
      const total = { ...subtotal, type: 'TOTAL'};
      invoice.components = [total, subtotal, amountDue];
    }
    order.invoice = invoice;
    const omitListCustomer = ['firstName', 'lastName', 'phoneNumber'];
    const customer = pick(order, omitListCustomer);
    order.customer = customer;
    order = omit(order, omitListCustomer);
    const usedPerks = await this.context.customerUsedPerk.loaders.byOrderSet.load(orderSetId);
    order.usedPerks = usedPerks;

    // Getting order item list
    let orderItemList = await this.roDb('order_items')
      .select('id', 'quantity', 'name', 'name_ar', 'name_tr', 'note')
      .where('order_set_id', orderSetId);

    const orderItemIds = orderItemList.map(orderItem => {
      return orderItem.id;
    });

    // Getting selected option list
    const selectedOptionList = await this.roDb('order_item_options')
      .select('id', 'value', 'value_ar', 'value_tr', 'price', 'order_item_id')
      .whereIn('order_item_id', orderItemIds);

    orderItemList = await Promise.all(
      orderItemList.map(orderItem => {
        const selectedOptions = filter(selectedOptionList, {
          orderItemId: orderItem.id,
        });
        orderItem.selectedOptions = addLocalizationField(
          selectedOptions,
          'value'
        );
        return orderItem;
      })
    );

    // Items added to order object
    order.items = addLocalizationField(orderItemList, 'name');

    // Fulfillment added to order object
    const omitListFulfillment = [
      'fulfillmentId',
      'fulfillmentType',
      'courierName',
      'vehicleDescription',
      'vehicleColor',
      'vehiclePlateNumber',
      'deliverToVehicle',
    ];
    const fullfilment = pick(order, omitListFulfillment);
    order.fulfillment = fullfilment;
    order.fulfillment.deliveryAddress = null;
    order = omit(order, omitListFulfillment);
    if (
      order.fulfillment.fulfillmentType === orderFulfillmentTypes.DELIVERY ||
      order.fulfillment.fulfillmentType === orderFulfillmentTypes.EXPRESS_DELIVERY
    ) {
      const deliveryAddress = await this.context.deliveryAddress.loaders.byOrderFulfillment.load(order.fulfillment.fulfillmentId);
      order.fulfillment.deliveryAddress = pick(deliveryAddress, ['extraFields', 'neighborhoodName', 'countryCode', 'city']);
    }
    order.coupon = null;
    if (order.couponId) {
      order.coupon = await this.context.coupon.selectFields(['id', 'code'])
        .where('id', order.couponId).first();
    }
    if (order.invoice.isSubscriptionAvailable) {
      order.invoice.subscriptionDetails = await Promise.all(
        order.invoice.subscriptionDetails.map(async detail => {
          const { name } = await this.context.cSubscription.selectFields(['name'])
            .where('id', detail.id).first();
          return { name, ...detail };
        })
      );
    }
    return order;
  }

  async validatePermissionByOrderSetId(orderSetId, permission) {
    // check if the admin has the same branch of orderSet
    // [attack_scope]
    if (!orderSetId) {
      return false;
    }
    const id = this.context.auth.id;
    if (!id) {
      return false;
    }
    const admin = await this.context.admin.getByAuthoId(id);
    if (!admin) {
      return false;
    }
    const brandAdminList = await this.context.brandAdmin.getByAdminId(admin.id);
    if (brandAdminList.length == 0) {
      const hasPermission = await this.validatePermissiosByPermission(permission);
      if (hasPermission) {
        return true;
      } else {
        return false;
      }
    }
    const order = await this.context.orderSet.getById(orderSetId);
    const orderBrand = await this.context.brand.getByBrandLocation(order.brandLocationId);
    for (const brand of brandAdminList) {
      if (!brand.brandLocationId) {
        if (brand.brandId != orderBrand.id) {
          return false;
        }
      } else {
        const branchIds = brandAdminList.map((item) => item.brandLocationId);
        if (!order || !order.brandLocationId || !branchIds.includes(order.brandLocationId)) {
          return false;
        }
      }
    }
    return true;
  }

  async validatePermissiosByPermission(permission) {
    const permissions = this.context.auth.permissions;
    if (permissions.length != 0 && permissions.includes(permission)) {
      return true;
    }
    return false;
  }


  async checkIfIsOnlyAdmin(orderSetId, permission) {
    // check if the admin has the same branch of orderSet
    // [attack_scope]
    if (!orderSetId) {
      return false;
    }
    const id = this.context.auth.id;
    if (!id) {
      return false;
    }
    const admin = await this.context.admin.getByAuthoId(id);
    if (!admin) {
      return false;
    }
    const brandAdminList = await this.context.brandAdmin.getByAdminId(admin.id);
    if (brandAdminList.length == 0) {
      const hasPermission = await this.validatePermissiosByPermission(permission);
      if (hasPermission) {
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }

  }

  async couponUsableForOrder(input, coupon) {
    const computeInvoice = new ComputeInvoice(this.context, {
      ...input,
      invoice: true,
    });
    await computeInvoice.init();
    await computeInvoice.validateOrder();
    const components = await computeInvoice.getInvoice();
    return await computeInvoice.isCouponUsable(components, coupon);
  }

  componentArrangerForMobile(components) {
    try {
      // old AMOUNT_DUE -> new TOTAL
      let newComponents = components;

      const total = newComponents.find(t => t.type === invoiceComponentType.TOTAL);
      const amountDue = newComponents.find(t => t.type === invoiceComponentType.AMOUNT_DUE);

      if (amountDue != null && total != null) {
        // Set amountDue's value to total
        total.value = amountDue.value;
      }

      if (amountDue) {
        newComponents = newComponents.filter(t => t.type !== invoiceComponentType.AMOUNT_DUE);
      }

      return newComponents;
    } catch (e) {
      return components;
    }
  }

  async getPaymentMethodsForOrder(orderSetId, couponId) {
    const invoice = await this.getInvoiceByOrderSetId(orderSetId);
    const orderPaymentMethod = await this.context.orderPaymentMethod.loaders.byOrderSet.load(
      orderSetId
    );
    let paymentMethod =
      orderPaymentMethod && orderPaymentMethod.paymentMethod
        ? orderPaymentMethod.paymentMethod
        : null;
    if (paymentMethod && paymentMethod.id) {
      paymentMethod = convertLegacyPaymentMethod(paymentMethod);
    } else if (paymentMethod && paymentMethod.length > 0) {
      paymentMethod = JSON.parse(paymentMethod);
      if (paymentMethod && paymentMethod.id) {
        paymentMethod = convertLegacyPaymentMethod(paymentMethod);
      }
    }
    const methods = [];
    if (paymentMethod) {
      const paidAmount = filter(invoice.components, t => t.type === invoiceComponentType.AMOUNT_PAID);
      let subInfo = null;
      if (paymentMethod.subText) {
        subInfo = paymentMethod.subText;
        if (subInfo.includes(' |')) {
          subInfo = subInfo.split(' |')[0];
        }
      }
      methods.push({
        name: paymentMethod.paymentScheme,
        imageUrl: paymentMethod.imageUrl ? paymentMethod.imageUrl : null,
        subInfo,
        amount: paidAmount[0].value,
        paymentMethodType: paymentMethod.paymentScheme
      });
    }

    /*const isVoucher = filter(invoice.components, t => t.type === invoiceComponentType.VOUCHER);
    if (isVoucher.length == 1) {
      const coupon = await this.context.coupon.getById(couponId);
      if (coupon) {
        methods.push({
          name: paymentMethodType.VOUCHER,
          imageUrl: null,
          subInfo: coupon.code,
          amount: isVoucher[0].value,
          paymentMethodType: paymentMethodType.VOUCHER
        });
      }
    }*/


    /*const isReward = filter(invoice.components, t => t.type === invoiceComponentType.REWARD_DISCOUNT);
    if (isReward.length == 1) {
      const reward = await this.context.customerUsedPerk.loaders.byOrderSet.load(orderSetId);
      if (reward) {
        methods.push({
          name: paymentMethodType.REWARD_DISCOUNT,
          imageUrl: null,
          subInfo:  reward.reduce((prev, curr) => {
            if (curr.type) {
              if (!prev) {
                return `${curr?.type}`;
              } else {
                return `${prev} + ${curr?.type}`;
              }
            }
          }, ''),
          amount: isReward[0].value,
          paymentMethodType: paymentMethodType.REWARD_DISCOUNT
        });
      }
    }*/

    const isCredits = filter(invoice.components, t => t.type === invoiceComponentType.CREDITS);
    if (isCredits.length == 1) {
      methods.push({
        name: paymentMethodType.CREDITS,
        imageUrl: null,
        subInfo: null,
        amount: isCredits[0].value,
        paymentMethodType: paymentMethodType.CREDITS
      });
    }

    const isGiftCard = filter(invoice.components, t => t.type === invoiceComponentType.GIFT_CARD);
    if (isGiftCard.length == 1) {
      methods.push({
        name: paymentMethodType.GIFT_CARD,
        imageUrl: null,
        subInfo: null,
        amount: isGiftCard[0].value,
        paymentMethodType: paymentMethodType.GIFT_CARD
      });
    }

    const isCashback = filter(invoice.components, t => t.type === invoiceComponentType.CASHBACK);
    if (isCashback.length == 1) {
      methods.push({
        name: paymentMethodType.CASHBACK,
        imageUrl: null,
        subInfo: null,
        amount: isCashback[0].value,
        paymentMethodType: paymentMethodType.CASHBACK
      });
    }

    /*const isDiscoveryCredit = filter(invoice.components, t => t.type === invoiceComponentType.DISCOVERY_CREDITS);
    if (isDiscoveryCredit.length == 1) {
      methods.push({
        name: paymentMethodType.DISCOVERY_CREDITS,
        imageUrl: null,
        subInfo: null,
        amount: isDiscoveryCredit[0].value,
        paymentMethodType: paymentMethodType.DISCOVERY_CREDITS
      });
    }*/

    const localizedList = map(methods, t => {
      t.name = this.context.storeOrderSet.getLocalizedMethodTitle(t.name);
      return t;
    });
    const addingItems = await this.context.paymentService.addIcons(localizedList);
    return addingItems;
  }

  paginator(items, currentPage, perPageItems) {
    const page = currentPage || 1;
    const perPage = perPageItems || 20;
    const offset = (page - 1) * perPage;

    const paginatedItems = items.slice(offset).slice(0, perPageItems);
    const totalPages = Math.ceil(items.length / perPage);

    return {
      paging: {
        page,
        perPage,
        prePage: page - 1 ? page - 1 : null,
        nextPage: (totalPages > page) ? page + 1 : null,
        total: items.length,
        totalPages,
      },
      results: paginatedItems,
    };
  }

  async getQueueById({ id, isSameBranchOnly = true, isTodayOnly = true }) {
    try {
      // Get the order set with the given id
      const orderSetFromView = await this.db('public.view_orders')
        .where({ id }).first();
      const country = await this.context.country.getById(orderSetFromView.countryId);
      if (!orderSetFromView) {
        throw new Error('Order set not found');
      }

      // Set up the base query
      let query = this.db('public.view_orders')
        .count('*')
        .as('queue_position')
        .where('created_at', '<', orderSetFromView.createdAt);

      // Apply filters based on the given parameters
      // if (isSameFulfillmentTypeOnly) {
      //   query = query.where('fulfillment_type', orderSetFromView.fulfillmentType);
      // }

      if (isSameBranchOnly) {
        query = query.where('brand_location_id', orderSetFromView.brandLocationId);
      }

      if (isTodayOnly) {
        const timezone = country.timeZoneIdentifier;
        const zonedCreatedAt = moment.tz(orderSetFromView.createdAt, timezone);
        const localDate = zonedCreatedAt.format('YYYY-MM-DD');
        const localDateStartUTC = moment.tz(`${localDate}T00:00:00`, timezone).utc().format();
        const localDateEndUTC = moment.tz(`${localDate}T23:59:59`, timezone).utc().format();

        query = query.whereBetween('created_at', [localDateStartUTC, localDateEndUTC]);
      }

      // Execute the query and get the queue position
      const result = await query;
      const queuePosition = result[0] ? parseInt(result[0].count) + 1 : 1;

      return queuePosition;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
}

module.exports = OrderSet;
