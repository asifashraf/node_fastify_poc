const { isGuestCustomer } = require('./utils');

describe('customers utils function tests', () => {
  test('isGuestCustomer should return true', () => {
    const testValue = isGuestCustomer({ id: 'customerId', authoId: null });
    expect(testValue).toBe(true);
  });
  test('isGuestCustomer should return false', () => {
    const testValue = isGuestCustomer({ id: 'customerId', authoId: 'auth0ID' });
    expect(testValue).toBe(false);
  });
});
