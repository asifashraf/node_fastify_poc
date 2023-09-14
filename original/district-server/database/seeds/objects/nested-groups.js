/* eslint-disable camelcase */
/* eslint-disable */

const casual = require('casual');

module.exports = groups => {
  return [
    {
      id: casual.uuid,
      group_id: groups['COFE'].id,
      nested_group_id: groups['Admins'].id,
    },
    {
      id: casual.uuid,
      group_id: groups['COFE'].id,
      nested_group_id: groups['CC Agent'].id,
    },
    {
      id: casual.uuid,
      group_id: groups['COFE'].id,
      nested_group_id: groups['CC Managers'].id,
    },
    {
      id: casual.uuid,
      group_id: groups['COFE'].id,
      nested_group_id: groups['CC Supervisor'].id,
    },
    {
      id: casual.uuid,
      group_id: groups['COFE'].id,
      nested_group_id: groups['Content Agent'].id,
    },
    {
      id: casual.uuid,
      group_id: groups['COFE'].id,
      nested_group_id: groups['Content Manager'].id,
    },
    {
      id: casual.uuid,
      group_id: groups['COFE'].id,
      nested_group_id: groups['Finance Managers'].id,
    },
    {
      id: casual.uuid,
      group_id: groups['COFE'].id,
      nested_group_id: groups['ONE Tech'].id,
    },
    {
      id: casual.uuid,
      group_id: groups['COFE'].id,
      nested_group_id: groups['PR Manger'].id,
    },
    {
      id: casual.uuid,
      group_id: groups['CC Agent'].id,
      nested_group_id: groups['Rayacorp Agents'].id,
    },
    {
      id: casual.uuid,
      group_id: groups['CC Supervisor'].id,
      nested_group_id: groups['Rayacorp Supervisor'].id,
    },
  ];
};
