const BaseModel = require('../../base-model');
const { createLoaders } = require('./loaders');
const {
  storeOrderTrackingInfoSaveError,
  paymentStatusOrderType,
} = require('../root/enums');
const Money = require('../../lib/currency');
const {
  storeOrderStatusName,
  storeOrderCreateError,
} = require('../root/enums');

const { transformToCamelCase, toDateWithTZ } = require('./../../lib/util');

const { map, get, find } = require('lodash');
const moment = require('moment');

const FinancialReportFormatter = require('./financial-report-formatter');
const { transactionType } = require('../root/enums');
const { transactionAction } = require('../root/enums');
const { paymentStatusName } = require('../root/enums');
const { storeOrderSetStatusName } = require('../root/enums');
const { storeOrderStatusError } = require('../root/enums');
const { addLocalizationField } = require('../../lib/util');

class StoreOrder extends BaseModel {
  constructor(db, context) {
    super(db, 'store_orders', context);
    this.loaders = createLoaders(this);
  }

  async getAllByStoreOrderSet(storeOrderSetId) {
    return this.loaders.byStoreOrderSet.load(storeOrderSetId);
  }

  getByShortCode(shortCode) {
    return this.db(this.tableName).where('short_code', shortCode.toUpperCase());
  }

  async createStoreOrder(data, products, status) {
    const storeOrderId = await this.save(data);

    products = map(products, p =>
      this.context.storeOrderProduct.save({
        storeOrderId,
        productId: p.id,
        quantity: p.quantity,
        name: p.name,
        nameAr: p.nameAr,
        nameTr: p.nameTr,
        price: p.price,
        compareAtPrice: p.compareAtPrice,
        costPerItem: p.costPerItem,
        image: p.image,
      })
    );

    await Promise.all(products);

    await this.context.storeOrderStatus.save({
      storeOrderId,
      status,
    });

    return { storeOrderId };
  }

  async getAllPaidFinancialReport(
    stream,
    { searchTerm, brandId, countryId, startDate, endDate, filterType }
  ) {
    if (startDate) {
      startDate = moment(startDate);
    }

    if (endDate) {
      endDate = moment(endDate);
    }

    const query = this.roDb(this.tableName)
      .select(
        'store_orders.*',
        'sos.status as currentStatus',
        'b.name as brandName',
        'soss.short_code as storeOrderSetShortCode',
        'soss.subtotal as storeOrderSetSubtotal',
        'soss.total as storeOrderSetTotal',
        'soss.fee as storeOrderSetFee',
        'soss.payment_method as storeOrderSetPaymentMethod',
        'soss.vat as storeOrderSetVat',
        'soss.total_vat as storeOrderSetTotalVat',
        'soss.paid as paid',
        'soss.src as src',
        'soss.src_platform as srcPlatform',
        'soss.src_platform_version as srcPlatformVersion',
        'c.id as customerId',
        'c.first_name as firstName',
        'c.last_name as lastName',
        'c.email as email',
        'c.phone_number as phoneNumber',
        'cu.iso_code as currencyCode',
        'cu.decimal_place as currencyDecimalPlace',
        'cu.lowest_denomination as currencyLowestDenomination',
        'sosf.time as time',
        'sosf.type as type',
        'sosf.note as note',
        'sosf.delivery_estimate as deliveyEstimate',
        this.db.raw(
          '(select count(*) as items from store_order_products where store_order_id = store_orders.id) items'
        ),
        this.db.raw(
          `(select string_agg(name, ',
          ') from store_order_products where store_order_id = store_orders.id) as itemNames`
        )
      )
      .join(
        'store_order_sets as soss',
        'soss.id',
        'store_orders.store_order_set_id'
      )
      .join('customers as c', 'c.id', 'soss.customer_id')
      .join(
        'store_order_set_fulfillment as sosf',
        'sosf.store_order_set_id',
        'soss.id'
      )
      .join('brands as b', 'b.id', 'store_orders.brand_id')
      .join('countries as co', 'co.id', 'soss.country_id')
      .join('currencies as cu', 'cu.id', 'soss.currency_id')
      .joinRaw(
        `
            INNER JOIN store_order_statuses AS sos
            ON sos.id = (SELECT id
            FROM   store_order_statuses
            WHERE  store_order_statuses.store_order_id = store_orders.id
            ORDER  BY created DESC
            LIMIT  1)
  `
      )
      .joinRaw(
        `
        INNER JOIN payment_statuses ON payment_statuses.id = (
          SELECT id FROM payment_statuses
          WHERE payment_statuses.reference_order_id = soss.id
          ORDER BY payment_statuses.created_at DESC LIMIT 1
)
`
      )
      .where('soss.paid', true)
      .orderBy('sosf.time', 'desc');

    if (brandId) {
      query.where('b.id', brandId);
    }
    if (countryId) {
      query.where('co.id', countryId);
    }
    if (startDate) {
      query.where('sosf.time', '>=', toDateWithTZ(startDate, 'start'));
    }

    if (endDate) {
      query.where('sosf.time', '<=', toDateWithTZ(endDate, 'end'));
    }

    if (searchTerm && searchTerm.toLowerCase() !== 'null') {
      query.andWhere(query => {
        query.whereRaw(`
            soss.short_code ILIKE '%${searchTerm}%' OR
            b.name ILIKE '%${searchTerm}%' OR
            concat(c.first_name, ' ', c.last_name)  ILIKE '%${searchTerm}%' OR
            c.email ILIKE '%${searchTerm}%' OR
            c.phone_number ILIKE '%${searchTerm}%'
          `);
      });
    }

    if (filterType && filterType !== 'ALL') {
      query.where('sos.status', filterType);
    }

    return (
      query
        // .then(transformToCamelCase)
        .stream(s => s.pipe(new FinancialReportFormatter()).pipe(stream))
        .catch(console.error)
    );
  }

  getAllByBrand(brandId) {
    return this.loaders.byBrandId.load(brandId);
  }

  async getPastStoreOrdersByCustomer(customerId, paging) {
    const query = `
${this.sqlForStoreOrderWithStatuses()}
WHERE
(
  sos.status = '${storeOrderStatusName.DELIVERED}'
  OR
  sos.status = '${storeOrderStatusName.REJECTED}'
  OR
  sos.status = '${storeOrderStatusName.CANCELED}'
)
AND
soss.customer_id = ?
ORDER BY so.created DESC
OFFSET ? LIMIT ?
`;
    const limit = get(paging, 'limit', 20);
    const offset = get(paging, 'offset', 0);

    return this.db
      .raw(query, [customerId, offset, limit])
      .then(result => transformToCamelCase(result.rows));
  }

  async getUpcomingStoreOrdersByCustomer(customerId, paging) {
    const query = `
${this.sqlForStoreOrderWithStatuses()}
WHERE
sos.status <> '${storeOrderStatusName.DELIVERED}'
AND
sos.status <> '${storeOrderStatusName.REJECTED}'
AND
sos.status <> '${storeOrderStatusName.CANCELED}'
AND
soss.customer_id = ?
ORDER BY so.created DESC
OFFSET ? LIMIT ?
`;
    const limit = get(paging, 'limit', 20);
    const offset = get(paging, 'offset', 0);

    return this.db
      .raw(query, [customerId, offset, limit])
      .then(result => transformToCamelCase(result.rows));
  }

  sqlForStoreOrderWithStatuses() {
    return `
    SELECT so.*
    FROM   store_orders AS so

    INNER JOIN store_order_sets soss on soss.id = so.store_order_set_id

    JOIN store_order_statuses AS sos
      ON sos.id = (SELECT id
                    FROM   store_order_statuses
                    WHERE  store_order_statuses.store_order_id = so.id
                    ORDER  BY created DESC
                    LIMIT  1)
`;
  }

  filterStoreOrders(query, filters = {}) {
    if (filters.searchText) {
      filters.searchText = filters.searchText.toLowerCase().trim();
      query.whereRaw(
        `(LOWER(${this.tableName}.short_code) like ?)`
        , [`%${filters.searchText}%`],
      );
    }

    if (filters.brandId) {
      query.where(`${this.tableName}.brand_id`, filters.brandId);
    }

    const dateRange = filters.dateRange;

    const startDate = get(dateRange, 'startDate');
    // console.log('startDate', startDate);
    const endDate = get(dateRange, 'endDate');

    if (startDate) {
      query.where(
        `${this.tableName}.created`,
        '>=',
        toDateWithTZ(startDate, 'start')
      );
    }

    if (endDate) {
      query.where(
        `${this.tableName}.created`,
        '<=',
        toDateWithTZ(endDate, 'end')
      );
    }

    if (filters.statuses && filters.statuses.length > 0) {
      query.whereIn('store_order_statuses.status', filters.statuses);
    }

    return query;
  }

  getAll(filters) {
    let query = super.getAll().select(this.db.raw(`${this.tableName}.*`))
      .joinRaw(`
        JOIN store_order_statuses ON store_order_statuses.id = (
          SELECT id
          FROM store_order_statuses
          WHERE store_order_statuses.store_order_id = store_orders.id
          ORDER BY created DESC
          LIMIT 1
        )
      `);
    if (filters) {
      query = this.filterStoreOrders(query, filters);
    }
    return query.orderBy('created', 'desc');
  }

  async getAllPaged(paging, filters) {
    const query = this.getAll(filters);
    return this.queryHelper(query)
      .addPaging(paging)
      .addCounting()
      .resolvePagedQuery();
  }

  async getAllPaidPaged(paging, filters) {
    let query = this.getAll(filters);
    query = query
      .join(
        'store_order_sets',
        'store_order_sets.id',
        `${this.tableName}.store_order_set_id`
      )
      .andWhere('store_order_sets.paid', true);

    if (filters.customerId) {
      query = query.andWhere('store_order_sets.customerId', filters.customerId);
    }

    if (filters.brandIdList) {
      query = query.whereIn(`${this.tableName}.brandId`, filters.brandIdList);
    }

    return this.queryHelper(query)
      .addPaging(paging)
      .addCounting()
      .resolvePagedQuery();
  }

  getCurrency(storeOrderId) {
    return this.loaders.currency.load(storeOrderId);
  }

  async validate(input) {
    const errors = [];
    if (input.id) {
      const storeOrder = await this.getById(input.id);
      if (!storeOrder) {
        errors.push(storeOrderCreateError.INVALID_STORE_ORDER);
      }
    }
    return errors;
  }

  async setAcknowledged(id) {
    await this.db(this.tableName)
      .where('id', id)
      .update({ acknowledged: true });
    this._idLoader.clear(id);
    return id;
  }

  async validateTrackingInfo(input) {
    const errors = [];
    if (input.orderType !== paymentStatusOrderType.STORE_ORDER) {
      errors.push(storeOrderTrackingInfoSaveError.INVALID_ORDER_TYPE);
    }
    if (input.referenceId) {
      const storeOrder = await this.getById(input.referenceId);
      if (!storeOrder) {
        errors.push(storeOrderTrackingInfoSaveError.INVALID_STORE_ORDER);
      }
    } else {
      errors.push(storeOrderTrackingInfoSaveError.INVALID_STORE_ORDER);
    }
    return errors;
  }

  async storeOrderStatusTotal(filters) {
    const data = {
      placed: 0,
      dispatched: 0,
      delivered: 0,
      canceled: 0,
      rejected: 0,
    };
    const query = this.getAll(filters);
    query.clearSelect();
    query.clearOrder();
    query
      .select(
        this.db
          .raw(`sum(case when store_order_statuses.status = 'PLACED' then 1 else 0 end) as placed,
      sum(case when store_order_statuses.status = 'DISPATCHED' then 1 else 0 end) as dispatched,
      sum(case when store_order_statuses.status = 'DELIVERED' then 1 else 0 end) as delivered,
      sum(case when store_order_statuses.status = 'CANCELED' then 1 else 0 end) as canceled,
      sum(case when store_order_statuses.status = 'REJECTED' then 1 else 0 end) as rejected`)
      )
      .groupBy('store_order_statuses.status');
    const rows = await query;

    map(rows, row => {
      if (row) {
        map(Object.keys(row), key => {
          const total = Number.parseInt(row[key], 10);
          if (total > 0) {
            data[key] = total;
          }
        });
      }
    });

    return data;
  }

  async paidWithCash(storeOrderId) {
    const storeOrder = await this.getById(storeOrderId);
    if (!storeOrder) throw storeOrderStatusError.INVALID_ORDER;
    const latestStatus = await this.context.storeOrderStatus
      .getLatestByStoreOrder(storeOrderId);

    if (!latestStatus) throw storeOrderStatusError.INVALID_STATE;
    if (latestStatus.status === storeOrderSetStatusName.DELIVERED) {
      throw storeOrderStatusError.ORDER_ALREADY_PROCESSED;
    }

    const storeOrderSet = await this.context.storeOrderSet.getById(
      storeOrder.storeOrderSetId
    );
    const currency = await this.context.currency.getById(storeOrderSet.currencyId);

    // !!!IMPORTANT!!!
    // should be calculated with used credits, coupons, fee etc.
    // but due to the limited time, it was ignored
    // for now cash will be used for one item
    // because of that, probably it won't be a problem
    // if there are more than one item because subtotal does not
    // decrease when one of order delivered
    // order will not never be completed
    // but with fee, credits, coupons etc. it is impossible to calculate
    // amountDue. every cash store order's total value
    // must be the same with cash on delivery amount
    // not product price or should be new field for that
    // remember each order can be delivered in different times.
    const amountDueFromSubtotal = Number(
      new Money(
        storeOrderSet.subtotal,
        currency.decimalPlace,
        currency.lowestDenomination
      ).sub(storeOrder.total).toCurrencyValue()
    );

    const promises = [
      this.context.storeOrderStatus.setStatus(
        storeOrderId,
        storeOrderSetStatusName.DELIVERED,
        this.context
      ),
      this.context.storeOrderSet.save({
        id: storeOrder.storeOrderSetId,
        paid: amountDueFromSubtotal === 0,
        amountDue: amountDueFromSubtotal > 0 ? storeOrderSet.amountDue : 0.0
      }),
      this.context.paymentStatus.save({
        referenceOrderId: storeOrderSet.id,
        orderType: paymentStatusOrderType.STORE_ORDER_SET,
        name: (amountDueFromSubtotal > 0)
          ? paymentStatusName.PAYMENT_PENDING
          : paymentStatusName.PAYMENT_SUCCESS,
        rawResponse: JSON.stringify({
          isCash: true,
          paid: true,
          storeOrderId
        }),
        isCashPayment: true,
      }),
    ];

    if (amountDueFromSubtotal === 0) {
      promises.push(
        this.context.transaction.save({
          referenceOrderId: storeOrderSet.id,
          orderType: paymentStatusOrderType.STORE_ORDER_SET,
          action: transactionAction.ORDER,
          type: transactionType.DEBITED,
          customerId: storeOrderSet.customerId,
          currencyId: storeOrderSet.currencyId,
          amount: storeOrderSet.amountDue,
        })
      );
    }

    return Promise.all(promises).then(([statusId]) => statusId);
  }

  async getStoreOrdersByCustomer(customerId, countryId, scanedPastYear = 0) {
    scanedPastYear = scanedPastYear < 0 ? 0 : scanedPastYear;
    const startDate = moment()
      .subtract(scanedPastYear, 'year')
      .startOf('year');
    const endDate = moment()
      .subtract(scanedPastYear, 'year')
      .endOf('year');

    const select = ` so.short_code, so.created, so.id, brand_id, so.total, sos.status as current_status_for_store_order, soss.customer_id, ca.friendly_name, 
      CASE WHEN (
        sos.status IS NULL OR
        sos.status = '${storeOrderStatusName.DELIVERED}' OR
        sos.status = '${storeOrderStatusName.REJECTED}' OR
        sos.status = '${storeOrderStatusName.CANCELED}'
      ) THEN true ELSE false END AS is_past`;

    const query = this.db('store_orders as so')
      .select(this.db.raw(select))
      .joinRaw('left join store_order_statuses as sos on sos.id = (SELECT id FROM store_order_statuses WHERE store_order_statuses.store_order_id = so.id ORDER  BY created desc LIMIT  1)')
      .leftJoin('store_order_sets as soss', 'soss.id', 'so.store_order_set_id')
      .leftJoin('store_order_set_fulfillment as sosf', 'sosf.store_order_set_id', 'soss.id')
      .joinRaw('left join customer_addresses as ca on ca.id = (sosf.delivery_address::json->>\'id\')::uuid')
      .where('soss.customer_id', customerId)
      .whereNotIn('sos.status', [storeOrderStatusName.INITIATED])
      .andWhereBetween('so.created', [toDateWithTZ(startDate, 'start'), toDateWithTZ(endDate, 'end')]);
    if (countryId) query.andWhereRaw(`soss.country_id = '${countryId}'`);
    let storeOrders = await query.orderBy('so.created', 'desc').limit(50);
    const brandIds = [];
    await Promise.all(
      storeOrders.map(storeOrder => {
        if (!brandIds.includes(storeOrder.brandId)) {
          brandIds.push(storeOrder.brandId);
        }
        return storeOrder;
      })
    );
    const brandList = await this.roDb('brands')
      .select(
        'id as brand_id',
        'name as brand_name',
        'name_ar as brand_name_ar',
        'name_tr as brand_name_tr',
        'favicon'
      )
      .whereIn('id', brandIds);
    storeOrders = await Promise.all(
      storeOrders.map(storeOrder => {
        const brand = find(brandList, { brandId: storeOrder.brandId });
        storeOrder = { ...storeOrder, ...brand };
        return addLocalizationField(storeOrder, 'brandName');
      })
    );
    return storeOrders;
  }

  /**
   * The getStoreOrdersByCustomer function is used by the getAllOrdersByCustomer resolver
   * It is deprecated but old customers continue to use it
   * When all client are updated please remove both(resolver and function)
   * and update this function name
   */
  async getStoreOrdersByCustomerNew(customerId, countryId, paging) {
    let pageVal = 1;
    let perPageVal = 20;
    if (paging) {
      pageVal = paging.page;
      perPageVal = paging.perPage;
    }
    const pastOrderStatuses = [
      storeOrderStatusName.DELIVERED,
      storeOrderStatusName.REJECTED,
      storeOrderStatusName.CANCELED
    ];

    const select = `so.short_code, so.created, so.id, so.brand_id, so.total, sos.status as current_status_for_store_order, soss.customer_id, ca.friendly_name,
      so.store_order_set_id, soss.short_code as store_order_set_short_code, b.name as brand_name, b.name_ar as brand_name_ar, b.name_tr as brand_name_tr, b.favicon `;
    const query = this.db('store_orders as so')
      .joinRaw('left join store_order_statuses as sos on sos.id = (SELECT id FROM store_order_statuses WHERE store_order_statuses.store_order_id = so.id ORDER  BY created desc LIMIT  1)')
      .leftJoin('store_order_sets as soss', 'soss.id', 'so.store_order_set_id')
      .leftJoin('store_order_set_fulfillment as sosf', 'sosf.store_order_set_id', 'soss.id')
      .leftJoin('brands as b', 'b.id', 'so.brand_id')
      .joinRaw('left join customer_addresses as ca on ca.id = (sosf.delivery_address::json->>\'id\')::uuid')
      .whereNot('sos.status', storeOrderStatusName.INITIATED)
      .where('soss.customer_id', customerId)
      .andWhere('soss.country_id', countryId)
      .andWhereRaw('so.created >= (now() - INTERVAL \'1 year\')');

    const pendingOrdersQuery = query.clone();
    const pendingOrders = await pendingOrdersQuery.select(this.roDb.raw(select))
      .whereNotIn('sos.status', pastOrderStatuses)
      .orderBy('so.created', 'desc')
      .limit(5);

    const countQuery = query.clone();
    const pastOrders = await query.select(this.roDb.raw(select))
      .whereIn('sos.status', pastOrderStatuses)
      .orderBy('so.created', 'desc')
      .offset((pageVal - 1) * perPageVal)
      .limit(perPageVal);
    const {count} = await countQuery.count('*').whereIn('sos.status', pastOrderStatuses).first();
    pastOrders.map(order => {
      return addLocalizationField(order, 'brandName');
    });
    pendingOrders.map(order => {
      return addLocalizationField(order, 'brandName');
    });
    const resp = this.addRefreshPagingWithSliced(pastOrders, pageVal, perPageVal, count);
    return {pendingOrders, pastOrders: resp};
  }
}

module.exports = StoreOrder;
