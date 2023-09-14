const { fetchGraphQL, queryContext } = require('../../lib/test-util');
const { updateCofeCreditsTransactionType } = require('../root/enums');
const Money = require('../../lib/currency');
const {
  customers,
  currencies,
} = require('../../../database/seeds/development');

test('can add credits', async () => {
  function getBalance() {
    return queryContext.handle.loyaltyTransaction.getBalanceByCustomer(
      customers[0].id,
      currencies.kd.id
    );
  }

  const currency = await queryContext.handle.currency.getById(currencies.kd.id);
  function constructMoney(amount) {
    return new Money(
      amount,
      currency.decimalPlace,
      currency.lowestDenomination
    );
  }
  const currentBalance = constructMoney(await getBalance());

  const mutation = `mutation{
    updateCofeCredits (
      input: {
        customerId: "${customers[0].id}"
        amount: "100"
        currencyId: "${currencies.kd.id}"
        operationType: ${updateCofeCreditsTransactionType.CREDIT}
      }
    ) {
      success
      error
      errors
    }
  }
  `;
  const response = await fetchGraphQL(mutation);
  const { data } = response;
  expect(data).toHaveProperty('updateCofeCredits.success', true);

  const balanceAfterCredit = constructMoney(await getBalance());
  expect(balanceAfterCredit.value).toBe(currentBalance.add(100).value);
});

test('can subtract credits', async () => {
  function getBalance() {
    return queryContext.handle.loyaltyTransaction.getBalanceByCustomer(
      customers[0].id,
      currencies.kd.id
    );
  }

  const currency = await queryContext.handle.currency.getById(currencies.kd.id);
  function constructMoney(amount) {
    return new Money(
      amount,
      currency.decimalPlace,
      currency.lowestDenomination
    );
  }
  const currentBalance = constructMoney(await getBalance());

  const mutation = `mutation{
    updateCofeCredits (
      input: {
        customerId: "${customers[0].id}"
        amount: "100"
        currencyId: "${currencies.kd.id}"
        operationType: ${updateCofeCreditsTransactionType.DEBIT}
      }
    ) {
      success
      error
      errors
    }
  }
  `;
  const response = await fetchGraphQL(mutation);
  const { data } = response;
  expect(data).toHaveProperty('updateCofeCredits.success', true);

  const balanceAfterCredit = constructMoney(await getBalance());
  expect(balanceAfterCredit.value).toBe(currentBalance.sub(100).value);
});
