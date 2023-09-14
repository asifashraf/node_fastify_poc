const BaseModel = require('../../base-model');
const { dateIntervalTypes } = require('./enums');
const { first } = require('lodash');

class VendorPortalDashboard extends BaseModel {
  constructor(db, context) {
    super(db, 'order_sets', context);
  }

  /**
   * get orders total sales percentage by fulfillment types (pickup, cars, ...) by given date interval and for the given branches
   * @param {Object} vendorPortalDashboardFiltersInput - filters object
   * @param {string[]} vendorPortalDashboardFiltersInput.branchIds
   * @param {('DAY'|'WEEK'|'MONTH')} vendorPortalDashboardFiltersInput.dateInterval - last day, week, or month
   */
  getTotalSalesPercentageByFulfillmentType({ branchIds, dateInterval }) {
    const query = this.roDb
      .select(
        this.roDb.raw(`
          sum(case when order_fulfillment."type" = 'PICKUP' then order_sets.total else 0 end)/sum(order_sets.total) as pickup,
          sum(case when order_fulfillment."type" = 'CAR' then order_sets.total else 0 end)/sum(order_sets.total) as car,
          sum(case when order_fulfillment."type" = 'DELIVERY' then order_sets.total else 0 end)/sum(order_sets.total) as delivery,
          sum(case when order_fulfillment."type" = 'EXPRESS_DELIVERY' then order_sets.total else 0 end)/sum(order_sets.total) as express_delivery
        `)
      )
      .from('order_sets')
      .joinRaw(
        'inner join order_fulfillment on order_fulfillment.order_set_id = order_sets.id'
      )
      .whereIn('order_sets.brand_location_id', branchIds)
      .andWhereRaw(
        `order_sets.created_at >= current_date - ${this.getDateIntervalStatement(
          dateInterval
        )}`
      );
    return this.context
      .sqlCache(query, 60 * 10) // 10 min cache
      .then(first);
  }

  /**
   * get total orders count by fulfillment types (pickup, cars, ...) by given date interval and for the given branches
   * @param {Object} vendorPortalDashboardFiltersInput - filters object
   * @param {string[]} vendorPortalDashboardFiltersInput.branchIds
   * @param {('DAY'|'WEEK'|'MONTH')} vendorPortalDashboardFiltersInput.dateInterval - last day, week, or month
   */
  getTotalOrderCountsByFulfillmentType({ branchIds, dateInterval }) {
    const query = this.roDb
      .select(
        this.roDb.raw(
          'order_fulfillment."type" as fulfillment_type, count(order_sets.id) as order_count'
        )
      )
      .from('order_sets')
      .joinRaw(
        'inner join order_fulfillment on order_fulfillment.order_set_id = order_sets.id'
      )
      .whereIn('order_sets.brand_location_id', branchIds)
      .andWhereRaw(
        `order_sets.created_at >= current_date - ${this.getDateIntervalStatement(
          dateInterval
        )}`
      )
      .groupByRaw('order_fulfillment."type"');
    return this.context.sqlCache(query, 60 * 10); // 10 min cache
  }

  /**
   * get orders payment methods percentage by given date interval and branches
   * @param {Object} vendorPortalDashboardFiltersInput - filters object
   * @param {string[]} vendorPortalDashboardFiltersInput.branchIds
   * @param {('DAY'|'WEEK'|'MONTH')} vendorPortalDashboardFiltersInput.dateInterval - last day, week, or month
   */
  getTotalSalesPercentageByPaymentMethod({ branchIds, dateInterval }) {
    const query = this.roDb
      .select(
        this.roDb.raw(`
          sum(case when order_sets.payment_method = 'CASH' then order_sets.total - (
              case when order_sets.pre_paid->>'creditsUsed' is not null then (order_sets.pre_paid->>'creditsUsed')::float else 0 end
            ) - (
              case when order_sets.pre_paid->>'giftCards' is not null then ((select json_array_elements(order_sets.pre_paid->'giftCards'))->>'value')::float else 0 end
            ) else 0 end)/sum(order_sets.total + order_sets.reward_amount) as cash,
          sum(case when order_sets.payment_method = 'APPLE_PAY' then order_sets.total - (
              case when order_sets.pre_paid->>'creditsUsed' is not null then (order_sets.pre_paid->>'creditsUsed')::float else 0 end
            ) - (
              case when order_sets.pre_paid->>'giftCards' is not null then ((select json_array_elements(order_sets.pre_paid->'giftCards'))->>'value')::float else 0 end
            ) else 0 end)/sum(order_sets.total + order_sets.reward_amount) as apple_pay,
          sum(case when order_sets.payment_method = 'GOOGLE_PAY' then order_sets.total - (
              case when order_sets.pre_paid->>'creditsUsed' is not null then (order_sets.pre_paid->>'creditsUsed')::float else 0 end
            ) - (
              case when order_sets.pre_paid->>'giftCards' is not null then ((select json_array_elements(order_sets.pre_paid->'giftCards'))->>'value')::float else 0 end
            ) else 0 end)/sum(order_sets.total + order_sets.reward_amount) as google_pay,
          sum(case when order_sets.payment_method = 'KNET' then order_sets.total - (
              case when order_sets.pre_paid->>'creditsUsed' is not null then (order_sets.pre_paid->>'creditsUsed')::float else 0 end
            ) - (
              case when order_sets.pre_paid->>'giftCards' is not null then ((select json_array_elements(order_sets.pre_paid->'giftCards'))->>'value')::float else 0 end
            ) else 0 end)/sum(order_sets.total + order_sets.reward_amount) as knet,
          sum(case when order_sets.payment_method = 'AMEX' then order_sets.total - (
              case when order_sets.pre_paid->>'creditsUsed' is not null then (order_sets.pre_paid->>'creditsUsed')::float else 0 end
            ) - (
              case when order_sets.pre_paid->>'giftCards' is not null then ((select json_array_elements(order_sets.pre_paid->'giftCards'))->>'value')::float else 0 end
            ) else 0 end)/sum(order_sets.total + order_sets.reward_amount) as amex,
          sum(case when (order_sets.payment_method = 'VISA') or (order_sets.payment_method = 'VISA/MASTER') or (order_sets.payment_method = 'CARD') or (order_sets.payment_method = 'SAVED_CARD') or (order_sets.payment_method = 'Debit/Credit Cards') or (order_sets.payment_method = 'Mastercard') then order_sets.total - (
              case when order_sets.pre_paid->>'creditsUsed' is not null then (order_sets.pre_paid->>'creditsUsed')::float else 0 end
            ) - (
              case when order_sets.pre_paid->>'giftCards' is not null then ((select json_array_elements(order_sets.pre_paid->'giftCards'))->>'value')::float else 0 end
            ) else 0 end)/sum(order_sets.total + order_sets.reward_amount) as visa_master,
          sum(case when order_sets.payment_method = 'STC_PAY' then order_sets.total - (
              case when order_sets.pre_paid->>'creditsUsed' is not null then (order_sets.pre_paid->>'creditsUsed')::float else 0 end
            ) - (
              case when order_sets.pre_paid->>'giftCards' is not null then ((select json_array_elements(order_sets.pre_paid->'giftCards'))->>'value')::float else 0 end
            ) else 0 end)/sum(order_sets.total + order_sets.reward_amount) as stc_pay,
          sum(case when order_sets.payment_method = 'MADA' then order_sets.total - (
              case when order_sets.pre_paid->>'creditsUsed' is not null then (order_sets.pre_paid->>'creditsUsed')::float else 0 end
            ) - (
              case when order_sets.pre_paid->>'giftCards' is not null then ((select json_array_elements(order_sets.pre_paid->'giftCards'))->>'value')::float else 0 end
            ) else 0 end)/sum(order_sets.total + order_sets.reward_amount) as mada,
          sum(
            case when order_sets.pre_paid->>'creditsUsed' is not null then (order_sets.pre_paid->>'creditsUsed')::float else 0 end
            )/sum(order_sets.total + order_sets.reward_amount) as credits,
          sum(
            case when order_sets.pre_paid->>'giftCards' is not null then ((select json_array_elements(order_sets.pre_paid->'giftCards'))->>'value')::float else 0 end
            )/sum(order_sets.total + order_sets.reward_amount) as gift_cards,
          sum(order_sets.reward_amount)/sum(order_sets.total + order_sets.reward_amount) as rewards
        `)
      )
      .from('order_sets')
      .whereIn('order_sets.brand_location_id', branchIds)
      .andWhereRaw(
        `order_sets.created_at >= current_date - ${this.getDateIntervalStatement(
          dateInterval
        )}`
      );
    return this.context
      .sqlCache(query, 60 * 10) // 10 min cache
      .then(first);
  }

  /**
   * get orders total sale, average amount of orders, and total refunds with time periods by given date interval and branches
   * @param {Object} vendorPortalDashboardFiltersInput - filters object
   * @param {string[]} vendorPortalDashboardFiltersInput.branchIds
   * @param {('DAY'|'WEEK'|'MONTH')} vendorPortalDashboardFiltersInput.dateInterval - last 12 day, 12 week, or 12 month periods
   */
  getSummaryOfSalesWithTimePeriod({ branchIds, dateInterval }) {
    const query = this.roDb
      .select(
        this.roDb.raw(`
          periods.start_date,
          periods.end_date,
          sum(order_sets.total) as total_sale,
          avg(order_sets.total) as average_order_sale,
          sum(case when order_sets.refunded = true then order_sets.total else 0 end) as refunds
        `)
      )
      .from('order_sets')
      .joinRaw(
        `
        JOIN (
           ${this.getPeriodsStatement(dateInterval)}
        ) as periods
        ON order_sets.created_at BETWEEN "periods"."start_date" AND "periods"."end_date"
      `
      )
      .whereIn('order_sets.brand_location_id', branchIds)
      .groupByRaw('"periods"."start_date", "periods"."end_date"');
    return this.context.sqlCache(query, 60 * 10); // 10 min cache
  }

  /**
   * get total orders, delayed, completed, rejected and, reported counts of
   * orders with time periods by given date interval and for the branches
   * @param {Object} vendorPortalDashboardFiltersInput - filters object
   * @param {string[]} vendorPortalDashboardFiltersInput.branchIds
   * @param {('DAY'|'WEEK'|'MONTH')} vendorPortalDashboardFiltersInput.dateInterval - last 12 day, 12 week, or 12 month periods
   */
  getSummaryOfOrdersWithTimePeriod({ branchIds, dateInterval }) {
    const query = this.roDb
      .select(
        this.roDb.raw(`
          periods.start_date,
          periods.end_date,
          count(order_sets.id) as total_orders,
          sum(case when
            ((order_set_statuses.status = 'COMPLETED' and order_fulfillment."type" = 'DELIVERY' and order_sets.created_at < (order_set_statuses.created_at - interval '25' minute))
            or (order_set_statuses.status = 'COMPLETED' and order_fulfillment."type" != 'DELIVERY' and order_sets.created_at < (order_set_statuses.created_at - interval '10' minute)))
            then 1 else 0 end) as delayed,
          sum(case when order_set_statuses.status = 'COMPLETED' then 1 else 0 end) as completed,
          sum(case when order_set_statuses.status = 'REJECTED' then 1 else 0 end) as rejected,
          sum(case when order_set_statuses.status = 'REPORTED' then 1 else 0 end) as reported
        `)
      )
      .from('order_sets')
      .joinRaw(
        `
          inner join order_set_statuses ON order_set_statuses.id = (
            SELECT id FROM order_set_statuses
            WHERE order_set_statuses.order_set_id = order_sets.id
            ORDER BY order_set_statuses.created_at DESC LIMIT 1
          )
      `
      )
      .joinRaw(
        `
          inner join order_fulfillment on order_fulfillment.order_set_id = order_sets.id
      `
      )
      .joinRaw(
        `
        JOIN (
           ${this.getPeriodsStatement(dateInterval)}
        ) as periods
        ON order_sets.created_at BETWEEN "periods"."start_date" AND "periods"."end_date"
      `
      )
      .whereIn('order_sets.brand_location_id', branchIds)
      .groupByRaw('"periods"."start_date", "periods"."end_date"');
    return this.context.sqlCache(query, 60 * 10); // 10 min cache
  }

  /**
   * get total customer and, new customer counts in orders with time periods
   * by given date interval and for the branches
   * @param {Object} vendorPortalDashboardFiltersInput - filters object
   * @param {string[]} vendorPortalDashboardFiltersInput.branchIds
   * @param {('DAY'|'WEEK'|'MONTH')} vendorPortalDashboardFiltersInput.dateInterval - last 12 day, 12 week, or 12 month periods
   */
  getSummaryOfCustomersWithTimePeriod({ branchIds, dateInterval }) {
    const query = this.roDb
      .select(
        this.roDb.raw(`
          periods.start_date,
          periods.end_date,
          array_length(array_agg(distinct order_sets.customer_id), 1) as total_customer,
          sum(case when customer_with_order_counts.order_count=1 then 1 else 0 end) as new_customer
        `)
      )
      .with('customer_with_order_counts', qb => {
        qb.select(
          this.roDb.raw(`
              order_sets.customer_id as customer_id,
              count(order_sets.id) as order_count
    `)
        )
          .from('order_sets')
          .whereIn('order_sets.brand_location_id', branchIds)
          .groupByRaw('order_sets.customer_id');
      })
      .from('order_sets')
      .joinRaw(
        `
          join customer_with_order_counts on customer_with_order_counts.customer_id = order_sets.customer_id
      `
      )
      .joinRaw(
        `
        JOIN (
           ${this.getPeriodsStatement(dateInterval)}
        ) as periods
        ON order_sets.created_at BETWEEN "periods"."start_date" AND "periods"."end_date"
      `
      )
      .whereIn('order_sets.brand_location_id', branchIds)
      .groupByRaw('"periods"."start_date", "periods"."end_date"');
    return this.context.sqlCache(query, 60 * 10); // 10 min cache
  }

  /**
   * get top 5 most selling products with total quantity and sales
   * by given date interval and for the given branches
   * @param {Object} vendorPortalDashboardFiltersInput - filters object
   * @param {string[]} vendorPortalDashboardFiltersInput.branchIds
   * @param {('DAY'|'WEEK'|'MONTH')} vendorPortalDashboardFiltersInput.dateInterval - last day, week, or month
   */
  getMostSellingProducts({ branchIds, dateInterval }) {
    const query = this.roDb
      .select(
        this.roDb.raw(`
          (array_agg(menu_items.section_id))[1] as menu_item_section_id,
          order_items.menu_item_id as menu_item_id,
          order_items."name" as product_name,
          sum(order_items.quantity) as quantity,
          sum(order_items.quantity*order_items.price) as sales
        `)
      )
      .from('order_sets')
      .joinRaw(
        'left join order_items on order_items.order_set_id = order_sets.id'
      )
      .joinRaw('join menu_items on menu_items.id = order_items.menu_item_id')
      .whereIn('order_sets.brand_location_id', branchIds)
      .andWhereRaw(
        `order_sets.created_at >= current_date - ${this.getDateIntervalStatement(
          dateInterval
        )}`
      )
      .groupByRaw('order_items.menu_item_id, order_items."name"')
      .orderByRaw('quantity desc nulls last')
      .limit(5);
    return this.context.sqlCache(query, 60 * 10); // 10 min cache
  }

  /**
   * get total count of order items according to menu item types (DRINK, FOOD, OTHERS)
   * by given date interval and for the given branches
   * @param {Object} vendorPortalDashboardFiltersInput - filters object
   * @param {string[]} vendorPortalDashboardFiltersInput.branchIds
   * @param {('DAY'|'WEEK'|'MONTH')} vendorPortalDashboardFiltersInput.dateInterval - last day, week, or month
   */
  getSummaryOfOrderItemsType({ branchIds, dateInterval }) {
    const query = this.roDb
      .select(
        this.roDb.raw(
          `
            menu_items."type" as menu_item_type,
            count(order_sets.id) as total_order
          `
        )
      )
      .from('order_sets')
      .joinRaw(
        'left join order_items on order_items.order_set_id = order_sets.id'
      )
      .joinRaw(
        'inner join menu_items on order_items.menu_item_id = menu_items.id'
      )
      .whereIn('order_sets.brand_location_id', branchIds)
      .andWhereRaw(
        `order_sets.created_at >= current_date - ${this.getDateIntervalStatement(
          dateInterval
        )}`
      )
      .groupByRaw('menu_items."type"');
    return this.context.sqlCache(query, 60 * 10); // 10 min cache
  }

  /**
   * get branches performances according to their completed, delayed, reported/rejected orders,
   * total sales, average order amounts, pickup, car, delivery orders, total customers and,
   * new customers
   * by given date interval and for the given branches
   * @param {Object} vendorPortalDashboardFiltersInput - filters object
   * @param {string[]} vendorPortalDashboardFiltersInput.branchIds
   * @param {('DAY'|'WEEK'|'MONTH')} vendorPortalDashboardFiltersInput.dateInterval - last day, week, or month
   */
  async getBranchesPerformances({ branchIds, dateInterval }) {
    const query = this.roDb
      .select(
        this.roDb.raw(
          `
            brand_locations."name" as branch_name,
            currencies.iso_code as currency_iso_code,
            sum(case when order_set_statuses.status = 'COMPLETED' then order_sets.total else 0 end) as total_sale,
            round(avg(case when order_set_statuses.status = 'COMPLETED' then order_sets.total else 0 end), 2) as average_order_amount,
            sum(case when order_set_statuses.status = 'COMPLETED' then 1 else 0 end) as completed_orders,
            sum(case when
              ((order_set_statuses.status = 'COMPLETED' and order_fulfillment."type" = 'DELIVERY' and order_sets.created_at < (order_set_statuses.created_at - interval '25' minute))
              or (order_set_statuses.status = 'COMPLETED' and order_fulfillment."type" != 'DELIVERY' and order_sets.created_at < (order_set_statuses.created_at - interval '10' minute)))
              then 1 else 0 end
              ) as delayed_orders,
            sum(case when order_set_statuses.status = 'REJECTED' or order_set_statuses.status = 'REPORTED' then 1 else 0 end) as rejected_reported_orders,
            sum(case when order_fulfillment."type" = 'PICKUP' then 1 else 0 end) as total_pickup_order,
            sum(case when order_fulfillment."type" = 'CAR' then 1 else 0 end) as total_car_order,
            sum(case when order_fulfillment."type" = 'DELIVERY' then 1 else 0 end) as total_delivery_order,
            array_length(array_agg(distinct order_sets.customer_id), 1) as total_customer,
            sum(case when customer_with_order_counts.order_count=1 then 1 else 0 end) as new_customer
          `
        )
      )
      .with('customer_with_order_counts', qb => {
        qb.select(
          this.roDb.raw(`
              order_sets.customer_id as customer_id,
              count(order_sets.id) as order_count
    `)
        )
          .from('order_sets')
          .whereIn('order_sets.brand_location_id', branchIds)
          .groupByRaw('order_sets.customer_id');
      })
      .from('order_sets')
      .joinRaw(
        `
          inner join order_set_statuses ON order_set_statuses.id = (
            SELECT id FROM order_set_statuses
            WHERE order_set_statuses.order_set_id = order_sets.id
            ORDER BY order_set_statuses.created_at DESC LIMIT 1
          )
      `
      )
      .joinRaw(
        `
          inner join order_fulfillment on order_fulfillment.order_set_id = order_sets.id
      `
      )
      .joinRaw(
        'join brand_locations on brand_locations.id = order_sets.brand_location_id'
      )
      .joinRaw(
        'join customer_with_order_counts on customer_with_order_counts.customer_id = order_sets.customer_id'
      )
      .joinRaw('join currencies on order_sets.currency_id = currencies.id')
      .whereIn('order_sets.brand_location_id', branchIds)
      .andWhereRaw(
        `order_sets.created_at >= current_date - ${this.getDateIntervalStatement(
          dateInterval
        )}`
      )
      .groupByRaw(
        'order_sets.brand_location_id, brand_locations."name", order_sets.currency_id, currencies.iso_code'
      );
    const allPerformanceList = await this.context.sqlCache(query, 60 * 10); // 10 min cache

    // get top 5 by completed orders
    const completedOrdersPerformance = this.getTopFiveByField(
      allPerformanceList,
      'completedOrders'
    );

    // get top 5 by delayed orders
    const delayedOrdersPerformance = this.getTopFiveByField(
      allPerformanceList,
      'delayedOrders'
    );

    // get top 5 by rejected/reported orders
    const rejectedReportedOrdersPerformance = this.getTopFiveByField(
      allPerformanceList,
      'rejectedReportedOrders'
    );

    // get top 5 by total sales
    const totalSalesPerformance = this.getTopFiveByField(
      allPerformanceList,
      'totalSale'
    );

    // get top 5 by average order amounts
    const averageOrderAmountsPerformance = this.getTopFiveByField(
      allPerformanceList,
      'averageOrderAmount'
    );

    // get top 5 by total pickup orders
    const totalPickupOrdersPerformance = this.getTopFiveByField(
      allPerformanceList,
      'totalPickupOrder'
    );

    // get top 5 by total car orders
    const totalCarOrdersPerformance = this.getTopFiveByField(
      allPerformanceList,
      'totalCarOrder'
    );

    // get top 5 by total delivery orders
    const totalDeliveryOrdersPerformance = this.getTopFiveByField(
      allPerformanceList,
      'totalDeliveryOrder'
    );

    // get top 5 by total customers
    const totalCustomersPerformance = this.getTopFiveByField(
      allPerformanceList,
      'totalCustomer'
    );

    // get top 5 by new customers
    const newCustomersPerformance = this.getTopFiveByField(
      allPerformanceList,
      'newCustomer'
    );

    // create combined table from ordered arrays
    const result = [];
    for (let i = 0; i < completedOrdersPerformance.length; i++) {
      result.push({
        completedOrders: `${completedOrdersPerformance[i].branchName} (${completedOrdersPerformance[i].completedOrders})`,
        delayedOrders: `${delayedOrdersPerformance[i].branchName} (${delayedOrdersPerformance[i].delayedOrders})`,
        rejectedReportedOrders: `${rejectedReportedOrdersPerformance[i].branchName} (${rejectedReportedOrdersPerformance[i].rejectedReportedOrders})`,
        totalSale: `${totalSalesPerformance[i].branchName} (${totalSalesPerformance[i].totalSale} ${totalSalesPerformance[i].currencyIsoCode})`,
        averageOrderAmount: `${averageOrderAmountsPerformance[i].branchName} (${averageOrderAmountsPerformance[i].averageOrderAmount} ${averageOrderAmountsPerformance[i].currencyIsoCode})`,
        totalPickupOrder: `${totalPickupOrdersPerformance[i].branchName} (${totalPickupOrdersPerformance[i].totalPickupOrder})`,
        totalCarOrder: `${totalCarOrdersPerformance[i].branchName} (${totalCarOrdersPerformance[i].totalCarOrder})`,
        totalDeliveryOrder: `${totalDeliveryOrdersPerformance[i].branchName} (${totalDeliveryOrdersPerformance[i].totalDeliveryOrder})`,
        totalCustomer: `${totalCustomersPerformance[i].branchName} (${totalCustomersPerformance[i].totalCustomer})`,
        newCustomer: `${newCustomersPerformance[i].branchName} (${newCustomersPerformance[i].newCustomer})`,
      });
    }
    console.table(result);
    return result;
  }

  /**
   * get branches performances according to their sales, and, average order amounts
   * by given date interval and for the given branches
   * @param {Array} performanceList - getBranchesPerformances query result
   * @param {string} fieldName - one of the performance fields
   */
  getTopFiveByField(performanceList, fieldName) {
    return performanceList
      .sort((itemOne, itemTwo) => itemTwo[fieldName] - itemOne[fieldName])
      .slice(0, 5);
  }

  /**
   * get sql date interval statement by given date interval
   * @param {('DAY'|'WEEK'|'MONTH')} dateInterval
   */
  getDateIntervalStatement(dateInterval) {
    if (dateInterval === dateIntervalTypes.MONTH) {
      return "interval '1' month";
    }
    if (dateInterval === dateIntervalTypes.WEEK) {
      return "interval '6' day";
    }
    return "interval '0' day";
  }

  /**
   * get sql statement that will use inside join periods statement by given date interval
   * @param {('DAY'|'WEEK'|'MONTH')} dateInterval
   */
  getPeriodsStatement(dateInterval) {
    if (dateInterval === dateIntervalTypes.MONTH) {
      return `
         SELECT CURRENT_DATE - interval '12' month as start_date, CURRENT_DATE - interval '11' month as end_date UNION all
         SELECT CURRENT_DATE - interval '11' month as start_date, CURRENT_DATE - interval '10' month as end_date UNION all
         SELECT CURRENT_DATE - interval '10' month as start_date, CURRENT_DATE - interval '9' month as end_date UNION all
         SELECT CURRENT_DATE - interval '9' month as start_date, CURRENT_DATE - interval '8' month as end_date UNION all
         SELECT CURRENT_DATE - interval '8' month as start_date, CURRENT_DATE - interval '7' month as end_date UNION all
         SELECT CURRENT_DATE - interval '7' month as start_date, CURRENT_DATE - interval '6' month as end_date UNION all
         SELECT CURRENT_DATE - interval '6' month as start_date, CURRENT_DATE - interval '5' month as end_date UNION all
         SELECT CURRENT_DATE - interval '5' month as start_date, CURRENT_DATE - interval '4' month as end_date UNION ALL
         SELECT CURRENT_DATE - interval '4' month as start_date, CURRENT_DATE - interval '3' month as end_date UNION ALL
         SELECT CURRENT_DATE - interval '3' month as start_date, CURRENT_DATE - interval '2' month as end_date UNION ALL
         SELECT CURRENT_DATE - interval '2' month as start_date, CURRENT_DATE - interval '1' month as end_date UNION ALL
         SELECT CURRENT_DATE - interval '1' month as start_date, current_timestamp as end_date
      `;
    }
    if (dateInterval === dateIntervalTypes.WEEK) {
      return `
         SELECT CURRENT_DATE - interval '83' day as start_date, CURRENT_DATE - interval '76' day as end_date UNION all
         SELECT CURRENT_DATE - interval '76' day as start_date, CURRENT_DATE - interval '69' day as end_date UNION all
         SELECT CURRENT_DATE - interval '69' day as start_date, CURRENT_DATE - interval '62' day as end_date UNION all
         SELECT CURRENT_DATE - interval '62' day as start_date, CURRENT_DATE - interval '55' day as end_date UNION all
         SELECT CURRENT_DATE - interval '55' day as start_date, CURRENT_DATE - interval '48' day as end_date UNION all
         SELECT CURRENT_DATE - interval '48' day as start_date, CURRENT_DATE - interval '41' day as end_date UNION all
         SELECT CURRENT_DATE - interval '41' day as start_date, CURRENT_DATE - interval '34' day as end_date UNION all
         SELECT CURRENT_DATE - interval '34' day as start_date, CURRENT_DATE - interval '27' day as end_date UNION ALL
         SELECT CURRENT_DATE - interval '27' day as start_date, CURRENT_DATE - interval '20' day as end_date UNION ALL
         SELECT CURRENT_DATE - interval '20' day as start_date, CURRENT_DATE - interval '13' day as end_date UNION ALL
         SELECT CURRENT_DATE - interval '13' day as start_date, CURRENT_DATE - interval '6' day as end_date UNION ALL
         SELECT CURRENT_DATE - interval '6' day as start_date, current_timestamp as end_date
      `;
    }
    return `
         SELECT CURRENT_DATE - interval '11' day as start_date, CURRENT_DATE - interval '10' day as end_date UNION all
         SELECT CURRENT_DATE - interval '10' day as start_date, CURRENT_DATE - interval '9' day as end_date UNION all
         SELECT CURRENT_DATE - interval '9' day as start_date, CURRENT_DATE - interval '8' day as end_date UNION all
         SELECT CURRENT_DATE - interval '8' day as start_date, CURRENT_DATE - interval '7' day as end_date UNION all
         SELECT CURRENT_DATE - interval '7' day as start_date, CURRENT_DATE - interval '6' day as end_date UNION all
         SELECT CURRENT_DATE - interval '6' day as start_date, CURRENT_DATE - interval '5' day as end_date UNION all
         SELECT CURRENT_DATE - interval '5' day as start_date, CURRENT_DATE - interval '4' day as end_date UNION all
         SELECT CURRENT_DATE - interval '4' day as start_date, CURRENT_DATE - interval '3' day as end_date UNION ALL
         SELECT CURRENT_DATE - interval '3' day as start_date, CURRENT_DATE - interval '2' day as end_date UNION ALL
         SELECT CURRENT_DATE - interval '2' day as start_date, CURRENT_DATE - interval '1' day as end_date UNION ALL
         SELECT CURRENT_DATE - interval '1' day as start_date, CURRENT_DATE - interval '0' day as end_date UNION ALL
         SELECT CURRENT_DATE - interval '0' day as start_date, current_timestamp as end_date
      `;
  }
}

module.exports = VendorPortalDashboard;
