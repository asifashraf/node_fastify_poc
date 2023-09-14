/* eslint-disable camelcase */
/* eslint-disable */

const casual = require('casual');

module.exports = (groups, roles) => {
  return [
    {
      id: casual.uuid,
      group_id: groups['Admins'].id,
      role_id: roles['Admin'].id,
    },
    {
      id: casual.uuid,
      group_id: groups['CC Agent'].id,
      role_id: roles['CCAgent'].id,
    },
    {
      id: casual.uuid,
      group_id: groups['CC Managers'].id,
      role_id: roles['CCManager'].id,
    },
    {
      id: casual.uuid,
      group_id: groups['CC Supervisor'].id,
      role_id: roles['CCSupervisor'].id,
    },
    {
      id: casual.uuid,
      group_id: groups['COFE'].id,
      role_id: roles['CDA'].id,
    },
    {
      id: casual.uuid,
      group_id: groups['Content Agent'].id,
      role_id: roles['ContentAgent'].id,
    },
    {
      id: casual.uuid,
      group_id: groups['Content Manager'].id,
      role_id: roles['ContentManager'].id,
    },
    {
      id: casual.uuid,
      group_id: groups['Finance Managers'].id,
      role_id: roles['Finance'].id,
    },
    {
      id: casual.uuid,
      group_id: groups['ONE Tech'].id,
      role_id: roles['superAdmin'].id,
    },
    {
      id: casual.uuid,
      group_id: groups['PR Manger'].id,
      role_id: roles['PRManager'].id,
    },
    {
      id: casual.uuid,
      group_id: groups['Super Admins'].id,
      role_id: roles['superAdmin'].id,
    },
    {
      id: casual.uuid,
      group_id: groups['CSE'].id,
      role_id: roles['CSE'].id,
    },
  ];
};
