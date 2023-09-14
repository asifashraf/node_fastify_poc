/* eslint-disable camelcase, max-params */
const casual = require('casual');
const { sample } = require('../utils.js');
const moment = require('moment');
const { omit, first, find, times } = require('lodash');

// =============================================================================

const orderSets = [];
const orderItems = [];
const orderItemOptions = [];
const paymentStatuses = [];
const orderSetStatuses = [];
const orderFulfillments = [];
const deliveryAddresses = [];

// =============================================================================

const sum = (lhs, rhs) => lhs + rhs;

/**
Inserts an order set and all its associated objects into the results arrays declared above.
*/
const makeOrderSet = (
  shortCode,
  customer,
  customerAddress,
  brandLocation,
  neighborhood,
  selectedItems,
  selectedItemOptions,
  numberOfOrders,
  useCredits
) => {
  const start = moment('2017-11-01T08:00Z').utc();
  const fee = 2.0;
  const subtotal = selectedItemOptions
    .map(o => parseFloat(o.price))
    .reduce(sum, 0);

  const orderSet = {
    id: casual.uuid,
    short_code: shortCode,
    created_at: start.toISOString(),
    acknowledged: true,
    customer_id: customer.id,
    brand_location_id: brandLocation.id,
    note: casual.text,
    subtotal,
    total: subtotal + fee,
    internal_note: casual.text,
    fee,
    coupon_amount: null,
    credits_used: useCredits === undefined ? false : useCredits,
  };
  orderSets.push(orderSet);

  // console.log(`@JARED: Created order set with id: ${orderSet.id}`);

  const _orderSetStatuses = [
    {
      id: casual.uuid,
      order_set_id: orderSet.id,
      status: 'PLACED',
      created_at: start.toISOString(),
    },
    {
      id: casual.uuid,
      order_set_id: orderSet.id,
      status: 'ACCEPTED',
      created_at: start
        .clone()
        .add(1, 'minutes')
        .toISOString(),
    },
    {
      id: casual.uuid,
      order_set_id: orderSet.id,
      status: 'REJECTED',
      created_at: start
        .clone()
        .add(15, 'minutes')
        .toISOString(),
    },
  ];
  orderSetStatuses.push(..._orderSetStatuses);

  times(selectedItems.length, index => {
    const menuItem = selectedItems[index];
    const menuItemOption = selectedItemOptions[index];
    const orderItem = {
      id: casual.uuid,
      name: menuItem.name,
      quantity: 1,
      price: menuItemOption.price,
      menu_item_id: menuItem.id,
      note: casual.coin_flip ? casual.sentence : null,
      order_set_id: orderSet.id,
    };
    const orderItemOption = {
      id: casual.uuid,
      menu_item_option_id: menuItemOption.id,
      value: menuItemOption.value,
      price: menuItemOption.price,
      order_item_id: orderItem.id,
    };
    orderItems.push(orderItem);
    orderItemOptions.push(orderItemOption);
  });

  const _paymentStatuses = [
    {
      id: casual.uuid,
      reference_order_id: orderSet.id,
      order_type: 'ORDER_SET',
      created_at: start.toISOString(),
      name: 'PAYMENT_PENDING',
    },
    {
      id: casual.uuid,
      reference_order_id: orderSet.id,
      order_type: 'ORDER_SET',
      created_at: start
        .clone()
        .add(1, 'minutes')
        .toISOString(),
      name: 'PAYMENT_SUCCESS',
    },
  ];
  paymentStatuses.push(..._paymentStatuses);

  const _orderFulfillments = [];
  times(numberOfOrders, index => {
    const fulfillment = {
      id: casual.uuid,
      order_set_id: orderSet.id,
      type: 'DELIVERY',
      time: start
        .clone()
        .add(1 + index, 'days')
        .hours(5)
        .minutes(0)
        .toISOString(),
      note: casual.text,
      deliver_to_vehicle: false,
      asap: false,
    };
    _orderFulfillments.push(fulfillment);
  });
  orderFulfillments.push(..._orderFulfillments);

  const _deliveryAddresses = _orderFulfillments.map(f => {
    return Object.assign(
      {
        id: casual.uuid,
        neighborhood_name: neighborhood.name,
        order_fulfillment_id: f.id,
      },
      omit(customerAddress, [
        'id',
        'customer_id',
        'neighborhood_id',
        'is_default',
      ])
    );
  });
  deliveryAddresses.push(..._deliveryAddresses);
};

// =============================================================================

module.exports = (
  sampleCustomers,
  customerAddresses,
  neighborhoods,
  brandLocations,
  menuItems,
  menuItemOptions
) => {
  const customer1 = sample(sampleCustomers);
  const address1 = find(customerAddresses, a => a.customer_id === customer1.id);
  const neighborhood1 = find(
    neighborhoods,
    n => n.id === address1.neighborhood_id
  );
  makeOrderSet(
    'ABC123',
    customer1,
    address1,
    brandLocations.caribou1,
    neighborhood1,
    [menuItems.caribouColdBrew, menuItems.caribouAmericano],
    [
      menuItemOptions.caribouColdBrewSizeSmall,
      menuItemOptions.caribouAmericanoSizeLarge,
    ],
    1
  );

  const customer2 = sample(sampleCustomers);
  const address2 = find(customerAddresses, a => a.customer_id === customer2.id);
  const neighborhood2 = find(
    neighborhoods,
    n => n.id === address2.neighborhood_id
  );
  makeOrderSet(
    'XYZ789',
    customer2,
    address2,
    brandLocations.caribou2,
    neighborhood2,
    [
      menuItems.caribouFilterBrew,
      menuItems.caribouSandwich,
      menuItems.caribouCookie,
    ],
    [
      menuItemOptions.caribouFilterBrewSizeLarge,
      menuItemOptions.caribouSandwich,
      menuItemOptions.caribouCookie,
    ],
    3
  );

  // Creating Order Set that will use credits
  const customer3 = first(sampleCustomers);
  const address3 = find(customerAddresses, a => a.customer_id === customer3.id);
  const neighborhood3 = find(
    neighborhoods,
    n => n.id === address3.neighborhood_id
  );
  makeOrderSet(
    'XYZ789',
    customer3,
    address3,
    brandLocations.caribou2,
    neighborhood3,
    [
      menuItems.caribouFilterBrew,
      menuItems.caribouSandwich,
      menuItems.caribouCookie,
    ],
    [
      menuItemOptions.caribouFilterBrewSizeLarge,
      menuItemOptions.caribouSandwich,
      menuItemOptions.caribouCookie,
    ],
    3,
    true
  );

  return {
    orderSets,
    orderItems,
    orderItemOptions,
    paymentStatuses,
    orderSetStatuses,
    orderFulfillments,
    deliveryAddresses,
  };
};
