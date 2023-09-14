const { map, find, filter, uniq, difference, first } = require('lodash');
const moment = require('moment');
const QueryHelper = require('../../lib/query-helper');

const BaseModel = require('../../base-model');
const { transformToCamelCase } = require('../../lib/util');
const { csvToJSON } = require('../../lib/aws-s3');
const { customerGroupPayloadError } = require('../root/enums');
const { createLoaders } = require('./loaders');

class CustomerGroup extends BaseModel {
  constructor(db, context) {
    super(db, 'customer_groups', context);
    this.loaders = createLoaders(this);
  }

  getCustomersFromGroup(customerGroupId) {
    return this.roDb
      .select('c.*')
      .from('customers AS c')
      .join('customer_groups_customers AS cgc', 'c.id', 'cgc.customer_id')
      .where('cgc.customer_group_id', customerGroupId)
      .then(transformToCamelCase);
  }

  getCustomerIdsFromGroup(customerGroupId) {
    return this.roDb
      .select('cgc.customer_id')
      .from('customer_groups_customers AS cgc')
      .where('cgc.customer_group_id', customerGroupId)
      .then(transformToCamelCase);
  }

  getByCustomerGroupIdAndCustomerId(customerGroupId, customerId) {
    return this.roDb
      .from('customer_groups_customers AS cgc')
      .where('cgc.customer_group_id', customerGroupId)
      .where('cgc.customer_id', customerId)
      .then(transformToCamelCase)
      .then(first);
  }

  async createGroupForVoucher(customerIds) {
    const existingCustomerIds = map(
      await this.roDb('customers').whereIn('id', customerIds),
      c => c.id
    );
    if (existingCustomerIds.length > 0) {
      const customerGroupId = await this.save({
        name: `Voucher Group ${moment().format()}`,
        generated: true,
      });
      const customerGroupsCustomers = map(existingCustomerIds, customerId => ({
        // eslint-disable-next-line camelcase
        customer_group_id: customerGroupId,
        // eslint-disable-next-line camelcase
        customer_id: customerId,
      }));
      await this.db('customer_groups_customers').insert(
        customerGroupsCustomers
      );
      return customerGroupId;
    }
  }

  async addCustomersInGroup(customerIds, customerGroupId) {
    const existingCustomerIds = map(
      await this.roDb('customers').whereIn('id', customerIds),
      c => c.id
    );
    if (existingCustomerIds.length > 0) {
      const customerGroupsCustomers = map(existingCustomerIds, customerId => ({
        // eslint-disable-next-line camelcase
        customer_group_id: customerGroupId,
        // eslint-disable-next-line camelcase
        customer_id: customerId,
      }));
      await this.db('customer_groups_customers').insert(
        customerGroupsCustomers
      );
      return customerGroupId;
    }
  }

  removeCustomersFromGroup(customerGroupId, customerIds) {
    return this.db('customer_groups_customers')
      .whereIn('customer_id', customerIds)
      .andWhere('customer_group_id', customerGroupId)
      .del();
  }

  async addCustomersToGroup(customerGroupId, customerIds) {
    const existingCustomerIds = map(
      await this.roDb('customers').whereIn('id', customerIds),
      c => c.id
    );
    if (existingCustomerIds.length > 0) {
      const customerGroupsCustomers = map(existingCustomerIds, customerId => ({
        // eslint-disable-next-line camelcase
        customer_group_id: customerGroupId,
        // eslint-disable-next-line camelcase
        customer_id: customerId,
      }));
      return this.db('customer_groups_customers').insert(
        customerGroupsCustomers
      );
    }
  }

  filterCustomerGroups(query, filters) {
    if (filters.searchText) {
      filters.searchText = filters.searchText.toLowerCase().trim();
      query.whereRaw(
        '(LOWER(customer_groups.name) like ? )'
        , [`%${filters.searchText}%`],
      );
    }
    return query;
  }

  async getAll(filters, paging) {
    let query = super
      .getAll()
      .select('*')
      .orderBy('created', 'desc');

    if (filters) {
      query = this.filterCustomerGroups(query, filters);
    }

    const rsp = await new QueryHelper(query)
      .addPaging(paging)
      .addCounting()
      .resolvePagedQuery();
    return rsp;
  }

  async validate({id, name, customers, fileUrl }) {
    const errors = [];
    customers = customers || [];
    if (customers.length > 0) {
      const invalidField = find(
        customers,
        c => !c.email && !c.phoneNumber && !c.customerId
      );
      if (invalidField) {
        errors.push(customerGroupPayloadError.INVALID_CUSTOMER);
      }
    } else if (!fileUrl) {
      errors.push(customerGroupPayloadError.CUSTOMER_NOT_FOUND);
    }

    if (id) {
      const customerGroup = await this.db(this.tableName)
        .select('*')
        .whereRaw('LOWER(name) ILIKE ?', [`${name}`]);
      if (!customerGroup && id !== customerGroup[0].id) {
        errors.push(customerGroupPayloadError.CUSTOMER_GROUP_ALREADY_EXISTS);
      }
    } else if (
      (await this.db(this.tableName)
        .count('*')
        .whereRaw('LOWER(name) ILIKE ?', [`${name}`]).first())['count'] > 0) {
      errors.push(customerGroupPayloadError.CUSTOMER_GROUP_ALREADY_EXISTS);
    }

    return errors;
  }

  async save({ id, name, customers, fileUrl }) {
    const errors = [];
    customers = customers || [];
    const isUpdate = Boolean(id);

    const customerGroupId = await super.save({ id, name, fileUrl });

    if (fileUrl) {
      customers = [];

      const pms = new Promise(async resolve => {
        const list = await csvToJSON({ uri: fileUrl });
        if (Array.isArray(list)) {
          const invalidField = find(list, n => n.length !== 3);
          if (invalidField) {
            resolve({ error: customerGroupPayloadError.INVALID_CUSTOMER });
          } else {
            resolve({
              list: map(list, chunk => {
                return {
                  customerId: chunk[0],
                  email: chunk[1],
                  phoneNumber: chunk[2],
                };
              }),
            });
          }
        } else {
          resolve({ error: customerGroupPayloadError.INVALID_FORMAT });
        }
      });
      const { list: listArray, error } = await pms;
      if (error) {
        return { customerGroupId, errors: [error] };
      }
      customers = listArray;
    }
    if (customers.length > 0) {
      const emails = uniq(
        filter(
          map(customers, c => (c.email ? c.email.trim().toLowerCase() : '')),
          e => e.length > 0
        )
      );
      const phoneNumbers = uniq(
        filter(
          map(customers, c => (c.phoneNumber ? c.phoneNumber.trim() : '')),
          p => p.length > 0
        )
      );

      const cIds = uniq(
        filter(
          map(customers, c => (c.customerId ? c.customerId.trim() : '')),
          p => p.length > 0
        )
      );

      const customerIds = map(
        await this.context.customer.getCustomerIdsFromEmailsOrPhonesOrIds(
          emails,
          phoneNumbers,
          cIds
        ),
        c => c.id
      );

      if (isUpdate) {
        if (customerIds && customerIds.length > 0) {
          const currentCustomersInGroup = map(
            await this.context.customerGroup.getCustomersFromGroup(
              customerGroupId
            ),
            c => c.id
          );
          const removeCustomersFromGroup = difference(
            currentCustomersInGroup,
            customerIds
          );
          const addCustomersToGroup = difference(
            customerIds,
            currentCustomersInGroup
          );
          if (removeCustomersFromGroup.length > 0) {
            await this.context.customerGroup.removeCustomersFromGroup(
              customerGroupId,
              removeCustomersFromGroup
            );
          }
          if (addCustomersToGroup.length > 0) {
            await this.context.customerGroup.addCustomersToGroup(
              customerGroupId,
              addCustomersToGroup
            );
          }
        }
      }

      if (!isUpdate && customerIds && customerIds.length > 0) {
        await this.addCustomersInGroup(customerIds, customerGroupId);
      }
    }
    return { customerGroupId, errors };
  }
}

module.exports = CustomerGroup;
