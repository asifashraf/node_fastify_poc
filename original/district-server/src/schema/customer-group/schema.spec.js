const { includes } = require('lodash');

const { queryContext } = require('../../lib/test-util');

const {
  customerGroups: customerGroupsSeeds,
  customers: customersSeeds,
} = require('../../../database/seeds/development');

test('can fetch a customer group', async () => {
  const customerGroup = await queryContext.handle.customerGroup.getById(
    customerGroupsSeeds[0].id
  );
  expect(customerGroup).toHaveProperty('name', customerGroupsSeeds[0].name);
});

test('can fetch all customer groups', async () => {
  const customerGroups = await queryContext.handle.customerGroup.getAll();
  expect(customerGroups.length).toEqual(customerGroupsSeeds.length);
});

test('can fetch customers from a customer group', async () => {
  const customers = await queryContext.handle.customerGroup.getCustomersFromGroup(
    customerGroupsSeeds[0].id
  );
  expect(customers.length).toEqual(1);
  expect(customers[0]).toHaveProperty('id', customersSeeds[0].id);
  expect(customers[0]).toHaveProperty(
    'firstName',
    customersSeeds[0].first_name
  );
});

test('can create a group for voucher', async () => {
  const customerIds = [customersSeeds[0].id, customersSeeds[3].id];
  const customerGroupId = await queryContext.handle.customerGroup.createGroupForVoucher(
    customerIds
  );

  const customers = await queryContext.handle.customerGroup.getCustomersFromGroup(
    customerGroupId
  );
  expect(customers.length).toEqual(customerIds.length);
  expect(includes(customerIds, customers[0].id)).toBeTruthy();
  expect(includes(customerIds, customers[1].id)).toBeTruthy();
});
