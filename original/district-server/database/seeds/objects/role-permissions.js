/* eslint-disable camelcase */
/* eslint-disable */

const casual = require('casual');

module.exports = (roles, permissions) => {
  return [
    // Admin
    {
      id: casual.uuid,
      role_id: roles['Admin'].id,
      permission_id: permissions['order:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['Admin'].id,
      permission_id: permissions['order:export'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['Admin'].id,
      permission_id: permissions['settings:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['Admin'].id,
      permission_id: permissions['voucher:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['Admin'].id,
      permission_id: permissions['brand:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['Admin'].id,
      permission_id: permissions['menu:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['Admin'].id,
      permission_id: permissions['brandlocation:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['Admin'].id,
      permission_id: permissions['customer:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['Admin'].id,
      permission_id: permissions['rewards:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['Admin'].id,
      permission_id: permissions['notifications:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['Admin'].id,
      permission_id: permissions['orderQueue:access'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['Admin'].id,
      permission_id: permissions['finance:access'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['Admin'].id,
      permission_id: permissions['orderPlatform:access'].id,
    },
    // CCAgent
    {
      id: casual.uuid,
      role_id: roles['CCAgent'].id,
      permission_id: permissions['order:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCAgent'].id,
      permission_id: permissions['order:update'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCAgent'].id,
      permission_id: permissions['settings:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCAgent'].id,
      permission_id: permissions['settings:update'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCAgent'].id,
      permission_id: permissions['voucher:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCAgent'].id,
      permission_id: permissions['voucher:upsert'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCAgent'].id,
      permission_id: permissions['brand:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCAgent'].id,
      permission_id: permissions['brand:upsert'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCAgent'].id,
      permission_id: permissions['menu:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCAgent'].id,
      permission_id: permissions['menu:upsert'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCAgent'].id,
      permission_id: permissions['brandlocation:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCAgent'].id,
      permission_id: permissions['brandlocation:upsert'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCAgent'].id,
      permission_id: permissions['customer:update'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCAgent'].id,
      permission_id: permissions['rewards:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCAgent'].id,
      permission_id: permissions['notifications:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCAgent'].id,
      permission_id: permissions['currency:upsert'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCAgent'].id,
      permission_id: permissions['country:upsert'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCAgent'].id,
      permission_id: permissions['city:upsert'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCAgent'].id,
      permission_id: permissions['neighborhood:upsert'].id,
    },
    // CCManager
    {
      id: casual.uuid,
      role_id: roles['CCManager'].id,
      permission_id: permissions['order:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCManager'].id,
      permission_id: permissions['order:update'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCManager'].id,
      permission_id: permissions['order:export'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCManager'].id,
      permission_id: permissions['courier:assign'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCManager'].id,
      permission_id: permissions['status:update'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCManager'].id,
      permission_id: permissions['settings:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCManager'].id,
      permission_id: permissions['settings:update'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCManager'].id,
      permission_id: permissions['voucher:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCManager'].id,
      permission_id: permissions['voucher:upsert'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCManager'].id,
      permission_id: permissions['voucher:delete'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCManager'].id,
      permission_id: permissions['voucher:export'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCManager'].id,
      permission_id: permissions['brand:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCManager'].id,
      permission_id: permissions['brand:upsert'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCManager'].id,
      permission_id: permissions['brand:delete'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCManager'].id,
      permission_id: permissions['brand:export'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCManager'].id,
      permission_id: permissions['menu:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCManager'].id,
      permission_id: permissions['menu:upsert'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCManager'].id,
      permission_id: permissions['menu:delete'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCManager'].id,
      permission_id: permissions['menu:export'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCManager'].id,
      permission_id: permissions['brandlocation:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCManager'].id,
      permission_id: permissions['brandlocation:upsert'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCManager'].id,
      permission_id: permissions['brandlocation:export'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCManager'].id,
      permission_id: permissions['customer:upsert'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCManager'].id,
      permission_id: permissions['customer:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCManager'].id,
      permission_id: permissions['customer:update'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCManager'].id,
      permission_id: permissions['customer:export'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCManager'].id,
      permission_id: permissions['cs:access'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCManager'].id,
      permission_id: permissions['fc:access'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCManager'].id,
      permission_id: permissions['rewards:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCManager'].id,
      permission_id: permissions['rewards:upsert'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCManager'].id,
      permission_id: permissions['notifications:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCManager'].id,
      permission_id: permissions['orderQueue:access'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCManager'].id,
      permission_id: permissions['voucher:upload'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCManager'].id,
      permission_id: permissions['order:refund'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCManager'].id,
      permission_id: permissions['notifications:upsert'].id,
    },
    // CCSupervisor
    {
      id: casual.uuid,
      role_id: roles['CCSupervisor'].id,
      permission_id: permissions['order:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCSupervisor'].id,
      permission_id: permissions['order:update'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCSupervisor'].id,
      permission_id: permissions['voucher:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCSupervisor'].id,
      permission_id: permissions['voucher:upsert'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCSupervisor'].id,
      permission_id: permissions['brand:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCSupervisor'].id,
      permission_id: permissions['menu:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCSupervisor'].id,
      permission_id: permissions['brandlocation:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCSupervisor'].id,
      permission_id: permissions['brandlocation:upsert'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCSupervisor'].id,
      permission_id: permissions['customer:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCSupervisor'].id,
      permission_id: permissions['customer:export'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCSupervisor'].id,
      permission_id: permissions['rewards:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCSupervisor'].id,
      permission_id: permissions['notifications:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCSupervisor'].id,
      permission_id: permissions['rewards:upsert'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CCSupervisor'].id,
      permission_id: permissions['order:refund'].id,
    },
    // CDA
    {
      id: casual.uuid,
      role_id: roles['CDA'].id,
      permission_id: permissions['order:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CDA'].id,
      permission_id: permissions['order:update'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CDA'].id,
      permission_id: permissions['courier:assign'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CDA'].id,
      permission_id: permissions['status:update'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CDA'].id,
      permission_id: permissions['settings:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CDA'].id,
      permission_id: permissions['settings:update'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CDA'].id,
      permission_id: permissions['voucher:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CDA'].id,
      permission_id: permissions['voucher:upsert'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CDA'].id,
      permission_id: permissions['voucher:delete'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CDA'].id,
      permission_id: permissions['brand:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CDA'].id,
      permission_id: permissions['brand:upsert'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CDA'].id,
      permission_id: permissions['brand:delete'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CDA'].id,
      permission_id: permissions['menu:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CDA'].id,
      permission_id: permissions['menu:upsert'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CDA'].id,
      permission_id: permissions['menu:delete'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CDA'].id,
      permission_id: permissions['brandlocation:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CDA'].id,
      permission_id: permissions['brandlocation:upsert'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CDA'].id,
      permission_id: permissions['brandlocation:export'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CDA'].id,
      permission_id: permissions['brandlocation:delete'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CDA'].id,
      permission_id: permissions['customer:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CDA'].id,
      permission_id: permissions['customer:upsert'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CDA'].id,
      permission_id: permissions['customer:update'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CDA'].id,
      permission_id: permissions['customer:export'].id,
    },
    // CDO
    {
      id: casual.uuid,
      role_id: roles['CDO'].id,
      permission_id: permissions['order:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CDO'].id,
      permission_id: permissions['order:update'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CDO'].id,
      permission_id: permissions['status:update'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CDO'].id,
      permission_id: permissions['settings:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CDO'].id,
      permission_id: permissions['voucher:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CDO'].id,
      permission_id: permissions['brand:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CDO'].id,
      permission_id: permissions['brandlocation:view'].id,
    },
    // CSE
    {
      id: casual.uuid,
      role_id: roles['CSE'].id,
      permission_id: permissions['order:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CSE'].id,
      permission_id: permissions['order:update'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CSE'].id,
      permission_id: permissions['order:export'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CSE'].id,
      permission_id: permissions['courier:assign'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CSE'].id,
      permission_id: permissions['status:update'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CSE'].id,
      permission_id: permissions['brand:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CSE'].id,
      permission_id: permissions['brand:export'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CSE'].id,
      permission_id: permissions['menu:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CSE'].id,
      permission_id: permissions['menu:upsert'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CSE'].id,
      permission_id: permissions['menu:export'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CSE'].id,
      permission_id: permissions['brandlocation:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CSE'].id,
      permission_id: permissions['brandlocation:upsert'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CSE'].id,
      permission_id: permissions['customer:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CSE'].id,
      permission_id: permissions['customer:export'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CSE'].id,
      permission_id: permissions['cs:access'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['CSE'].id,
      permission_id: permissions['orderQueue:access'].id,
    },
    // ContentAgent
    {
      id: casual.uuid,
      role_id: roles['ContentAgent'].id,
      permission_id: permissions['settings:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['ContentAgent'].id,
      permission_id: permissions['voucher:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['ContentAgent'].id,
      permission_id: permissions['voucher:upsert'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['ContentAgent'].id,
      permission_id: permissions['brand:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['ContentAgent'].id,
      permission_id: permissions['brand:upsert'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['ContentAgent'].id,
      permission_id: permissions['brand:export'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['ContentAgent'].id,
      permission_id: permissions['menu:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['ContentAgent'].id,
      permission_id: permissions['menu:upsert'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['ContentAgent'].id,
      permission_id: permissions['menu:delete'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['ContentAgent'].id,
      permission_id: permissions['menu:export'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['ContentAgent'].id,
      permission_id: permissions['brandlocation:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['ContentAgent'].id,
      permission_id: permissions['brandlocation:upsert'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['ContentAgent'].id,
      permission_id: permissions['brandlocation:delete'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['ContentAgent'].id,
      permission_id: permissions['brandlocation:export'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['ContentAgent'].id,
      permission_id: permissions['rewards:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['ContentAgent'].id,
      permission_id: permissions['rewards:upsert'].id,
    },
    // ContentManager
    {
      id: casual.uuid,
      role_id: roles['ContentManager'].id,
      permission_id: permissions['settings:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['ContentManager'].id,
      permission_id: permissions['settings:update'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['ContentManager'].id,
      permission_id: permissions['voucher:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['ContentManager'].id,
      permission_id: permissions['voucher:upsert'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['ContentManager'].id,
      permission_id: permissions['brand:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['ContentManager'].id,
      permission_id: permissions['brand:upsert'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['ContentManager'].id,
      permission_id: permissions['menu:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['ContentManager'].id,
      permission_id: permissions['menu:upsert'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['ContentManager'].id,
      permission_id: permissions['brandlocation:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['ContentManager'].id,
      permission_id: permissions['brandlocation:upsert'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['ContentManager'].id,
      permission_id: permissions['customer:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['ContentManager'].id,
      permission_id: permissions['rewards:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['ContentManager'].id,
      permission_id: permissions['rewards:upsert'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['ContentManager'].id,
      permission_id: permissions['voucher:upload'].id,
    },
    // Finance
    {
      id: casual.uuid,
      role_id: roles['Finance'].id,
      permission_id: permissions['order:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['Finance'].id,
      permission_id: permissions['order:export'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['Finance'].id,
      permission_id: permissions['voucher:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['Finance'].id,
      permission_id: permissions['brand:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['Finance'].id,
      permission_id: permissions['brand:export'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['Finance'].id,
      permission_id: permissions['menu:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['Finance'].id,
      permission_id: permissions['menu:export'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['Finance'].id,
      permission_id: permissions['brandlocation:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['Finance'].id,
      permission_id: permissions['customer:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['Finance'].id,
      permission_id: permissions['customer:export'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['Finance'].id,
      permission_id: permissions['fc:access'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['Finance'].id,
      permission_id: permissions['rewards:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['Finance'].id,
      permission_id: permissions['notifications:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['Finance'].id,
      permission_id: permissions['finance:access'].id,
    },
    // PRManager
    {
      id: casual.uuid,
      role_id: roles['PRManager'].id,
      permission_id: permissions['brand:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['PRManager'].id,
      permission_id: permissions['notifications:view'].id,
    },
    {
      id: casual.uuid,
      role_id: roles['PRManager'].id,
      permission_id: permissions['notifications:upsert'].id,
    },
    // superAdmin
    {
      id: casual.uuid,
      role_id: roles['superAdmin'].id,
      permission_id: permissions['All'].id,
    },
  ];
};
