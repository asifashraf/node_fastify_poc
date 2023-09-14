/* eslint-disable camelcase */
const casual = require('casual');

module.exports = () => {
  return {
    Admin: {
      id: casual.uuid,
      name: 'Admin',
      description: 'Can View Everything',
    },
    CCAgent: {
      id: casual.uuid,
      name: 'CCAgent',
      description: 'Customer Care Agent',
    },
    CCManager: {
      id: casual.uuid,
      name: 'CCManager',
      description: 'Customer Care Manager',
    },
    CCSupervisor: {
      id: casual.uuid,
      name: 'CCSupervisor',
      description: 'Customer Care Supervisor',
    },
    CDA: {
      id: casual.uuid,
      name: 'CDA',
      description: 'COFE Admin Panel',
    },
    CDO: {
      id: casual.uuid,
      name: 'CDO',
      description: 'COFE Orders Admin Panel',
    },
    CSE: {
      id: casual.uuid,
      name: 'CSE',
      description: 'Cofe Shop Employee',
    },
    ContentAgent: {
      id: casual.uuid,
      name: 'ContentAgent',
      description: 'Content Agent',
    },
    ContentManager: {
      id: casual.uuid,
      name: 'ContentManager',
      description: 'Content Manager',
    },
    Customer: {
      id: casual.uuid,
      name: 'Customer',
      description: 'Cofe District customer',
    },
    Finance: {
      id: casual.uuid,
      name: 'Finance',
      description: 'Finance Department',
    },
    PRManager: {
      id: casual.uuid,
      name: 'PRManager',
      description: 'Public Relations Manager',
    },
    superAdmin: {
      id: casual.uuid,
      name: 'superAdmin',
      description: 'All Permisions',
    },
  };
};
