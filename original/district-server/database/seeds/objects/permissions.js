/* eslint-disable camelcase */
const casual = require('casual');

module.exports = () => {
  return {
    All: {
      id: casual.uuid,
      name: 'All',
      description: 'all',
    },
    'brand:delete': {
      id: casual.uuid,
      name: 'brand:delete',
      description: 'Can delete brand(s)',
    },
    'brand:export': {
      id: casual.uuid,
      name: 'brand:export',
      description: 'Can export brand(s) to CSV',
    },
    'brand:upsert': {
      id: casual.uuid,
      name: 'brand:upsert',
      description: 'Can upsert brand(s)',
    },
    'brand:view': {
      id: casual.uuid,
      name: 'brand:view',
      description: 'Can view brand(s)',
    },
    'brandlocation:delete': {
      id: casual.uuid,
      name: 'brandlocation:delete',
      description: 'Can delete brand location(s)',
    },
    'brandlocation:export': {
      id: casual.uuid,
      name: 'brandlocation:export',
      description: 'Can export brand location(s) to CSV',
    },
    'brandlocation:upsert': {
      id: casual.uuid,
      name: 'brandlocation:upsert',
      description: 'Can upsert brand location(s)',
    },
    'brandlocation:view': {
      id: casual.uuid,
      name: 'brandlocation:view',
      description: 'Can view brand location(s)',
    },
    'city:upsert': {
      id: casual.uuid,
      name: 'city:upsert',
      description: 'Can upsert a city',
    },
    'country:upsert': {
      id: casual.uuid,
      name: 'country:upsert',
      description: 'Can upsert a country',
    },
    'courier:assign': {
      id: casual.uuid,
      name: 'courier:assign',
      description: 'Can assign courier to order set order (plaintext)',
    },
    'cs:access': {
      id: casual.uuid,
      name: 'cs:access',
      description: 'Customer Services Access',
    },
    'currency:upsert': {
      id: casual.uuid,
      name: 'currency:upsert',
      description: 'Can upsert a currency',
    },
    'customer:export': {
      id: casual.uuid,
      name: 'customer:export',
      description: 'Can export customer(s) to CSV',
    },
    'customer:update': {
      id: casual.uuid,
      name: 'customer:update',
      description: 'Can update customer(s)',
    },
    'customer:upsert': {
      id: casual.uuid,
      name: 'customer:upsert',
      description: 'Can upsert Customers',
    },
    'customer:view': {
      id: casual.uuid,
      name: 'customer:view',
      description: 'Can view customer(s)',
    },
    'fc:access': {
      id: casual.uuid,
      name: 'fc:access',
      description: 'Financial Services Access',
    },
    'finance:access': {
      id: casual.uuid,
      name: 'finance:access',
      description: 'Can access financial report',
    },
    'menu:delete': {
      id: casual.uuid,
      name: 'menu:delete',
      description: 'Can delete menu(s)',
    },
    'menu:export': {
      id: casual.uuid,
      name: 'menu:export',
      description: 'Can export menu(s) to CSV',
    },
    'menu:upsert': {
      id: casual.uuid,
      name: 'menu:upsert',
      description: 'Can upsert menu(s)',
    },
    'menu:view': {
      id: casual.uuid,
      name: 'menu:view',
      description: 'Can view menu(s)',
    },
    'neighborhood:upsert': {
      id: casual.uuid,
      name: 'neighborhood:upsert',
      description: 'Can upsert a neighborhood',
    },
    'notifications:upsert': {
      id: casual.uuid,
      name: 'notifications:upsert',
      description: 'Can create/update notification(s)',
    },
    'notifications:view': {
      id: casual.uuid,
      name: 'notifications:view',
      description: 'Can View Notification(s)',
    },
    'order:export': {
      id: casual.uuid,
      name: 'order:export',
      description: 'Can export order set(s) to CSV',
    },
    'order:refund': {
      id: casual.uuid,
      name: 'order:refund',
      description: 'Can refund an order',
    },
    'order:update': {
      id: casual.uuid,
      name: 'order:update',
      description:
        'Can update order set details like notes (courier and status updates not included)',
    },
    'order:view': {
      id: casual.uuid,
      name: 'order:view',
      description: 'Can view order set(s)',
    },
    'orderPlatform:access': {
      id: casual.uuid,
      name: 'orderPlatform:access',
      description: 'Can access the Order Platfrom',
    },
    'orderQueue:access': {
      id: casual.uuid,
      name: 'orderQueue:access',
      description: 'orderQueue Access',
    },
    'rewards:upsert': {
      id: casual.uuid,
      name: 'rewards:upsert',
      description: 'Can Add/Edit Rewards',
    },
    'rewards:view': {
      id: casual.uuid,
      name: 'rewards:view',
      description: 'Rewards Program',
    },
    'settings:update': {
      id: casual.uuid,
      name: 'settings:update',
      description: 'Can update setting(s) value',
    },
    'settings:view': {
      id: casual.uuid,
      name: 'settings:view',
      description: 'Can view platform settings',
    },
    'status:update': {
      id: casual.uuid,
      name: 'status:update',
      description: 'Can update status of an order set',
    },
    'voucher:delete': {
      id: casual.uuid,
      name: 'voucher:delete',
      description: 'Can delete voucher(s)',
    },
    'voucher:export': {
      id: casual.uuid,
      name: 'voucher:export',
      description: 'Can export voucher(s) to CSV',
    },
    'voucher:upload': {
      id: casual.uuid,
      name: 'voucher:upload',
      description: 'Can upload vouchers from CSV',
    },
    'voucher:upsert': {
      id: casual.uuid,
      name: 'voucher:upsert',
      description: 'Can upsert voucher(s)',
    },
    'voucher:view': {
      id: casual.uuid,
      name: 'voucher:view',
      description: 'Can view voucher(s)',
    },
  };
};
