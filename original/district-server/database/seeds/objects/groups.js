/* eslint-disable camelcase */
const casual = require('casual');

module.exports = () => {
  return {
    Admins: {
      id: casual.uuid,
      name: 'Admins',
      description: 'Users with admin level access',
    },
    'CC Agent': {
      id: casual.uuid,
      name: 'CC Agent',
      description: 'Users with Call Center Agent Access',
    },
    'CC Managers': {
      id: casual.uuid,
      name: 'CC Managers',
      description: 'Users with customer care manager level access',
    },
    'CC Supervisor': {
      id: casual.uuid,
      name: 'CC Supervisor',
      description: 'Users with customer care supervisor level access',
    },
    COFE: {
      id: casual.uuid,
      name: 'COFE',
      description: 'Employees of COFE',
    },
    'Content Agent': {
      id: casual.uuid,
      name: 'Content Agent',
      description: 'Users with content agent level access',
    },
    'Content Manager': {
      id: casual.uuid,
      name: 'Content Manager',
      description: 'Users with content manager level access',
    },
    'Finance Managers': {
      id: casual.uuid,
      name: 'Finance Managers',
      description: 'User with finance level access',
    },
    'ONE Tech': {
      id: casual.uuid,
      name: 'ONE Tech',
      description: 'Employees of ONE Tech - Super Admin roles',
    },
    'PR Manger': {
      id: casual.uuid,
      name: 'PR Manger',
      description: 'Users with public relations manager level access',
    },
    'Super Admins': {
      id: casual.uuid,
      name: 'Super Admins',
      description: 'Users with SuperAdmin level access',
    },
    'Vendor Employees': {
      id: casual.uuid,
      name: 'Vendor Employees',
      description: 'shopEmployee role for all Vendor Employees',
    },
    CSE: {
      id: casual.uuid,
      name: 'CSE',
      description: 'CSE',
    },
    'Rayacorp Agents': {
      id: casual.uuid,
      name: 'Rayacorp Agents',
      description: 'Agents of Raya Corp',
    },
    'Rayacorp Supervisor': {
      id: casual.uuid,
      name: 'Rayacorp Supervisor',
      description: 'Supervisors of Raya Corp',
    },
  };
};
