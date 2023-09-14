const {
  toGateAddress,
  orderSetPaymentMethod,
  creditsPaymentMethod,
  roundNumber,
  cloneObject,
} = require('./util');
const {
  orderPaymentMethods,
  creditsPaymentMethods,
} = require('../schema/root/enums');

test('clone object test', () => {
  const object = {
    test: 'a',
    foo: [
      {
        bar: 2,
      },
    ],
  };
  const clonedObject = cloneObject(object);
  expect(object === clonedObject).toBe(false);
  const secondClonedObject = object;
  expect(object === secondClonedObject).toBe(true);
});

test('create gate address', async () => {
  const address = {
    airportName: 'Sample Airport',
    terminalNumber: 'Terminal A',
    gateNumber: 'Gate 1',
  };
  const result = toGateAddress(address);
  expect(result).toMatchSnapshot();
});

test('add payment method to order set', () => {
  const orderSet = {
    id: '9077f5e1-3098-477d-ae5d-c0ee82a5e66d',
    creditsUsed: false,
    cashOnDelivery: false,
    paymentMethod: 'CARD',
  };
  let r = orderSetPaymentMethod(orderSet);
  expect(r).toHaveProperty('paymentMethod', orderPaymentMethods.CARD);

  const orderSets = [
    {
      id: '9077f5e1-3098-477d-ae5d-c0ee82a5e66d',
      creditsUsed: false,
      cashOnDelivery: false,
      paymentMethod: 'CARD',
    },
    {
      id: '9077f5e1-3098-477d-ae5d-c0ee82a5e66d',
      creditsUsed: true,
      cashOnDelivery: false,
    },
    {
      id: '9077f5e1-3098-477d-ae5d-c0ee82a5e66d',
      creditsUsed: false,
      cashOnDelivery: false,
      paymentMethod: null,
    },
    {
      id: '9077f5e1-3098-477d-ae5d-c0ee82a5e66d',
      creditsUsed: false,
      cashOnDelivery: true,
      paymentMethod: null,
    },
  ];

  r = orderSetPaymentMethod(orderSets);
  expect(r).toBeInstanceOf(Array);
  expect(r[0]).toHaveProperty('paymentMethod', orderPaymentMethods.CARD);
  expect(r[1]).toHaveProperty('paymentMethod', orderPaymentMethods.CREDITS);
  expect(r[2]).toHaveProperty('paymentMethod', orderPaymentMethods.KNET);
  expect(r[3]).toHaveProperty('paymentMethod', orderPaymentMethods.CASH);
});

test('add payment method to loyalty order', () => {
  const creditOrder = {
    id: '9077f5e1-3098-477d-ae5d-c0ee82a5e66d',
    paymentMethod: 'CARD',
  };
  let r = creditsPaymentMethod(creditOrder);
  expect(r).toHaveProperty('paymentMethod', creditsPaymentMethods.CARD);

  const orderSets = [
    {
      id: '9077f5e1-3098-477d-ae5d-c0ee82a5e66d',
      paymentMethod: 'KNET',
    },
    {
      id: '9077f5e1-3098-477d-ae5d-c0ee82a5e66d',
    },
    {
      id: '9077f5e1-3098-477d-ae5d-c0ee82a5e66d',
      paymentMethod: null,
    },
    {
      id: '9077f5e1-3098-477d-ae5d-c0ee82a5e66d',
      paymentMethod: 'CARD',
    },
  ];

  r = creditsPaymentMethod(orderSets);
  expect(r).toBeInstanceOf(Array);
  expect(r[0]).toHaveProperty('paymentMethod', creditsPaymentMethods.KNET);
  expect(r[1]).toHaveProperty('paymentMethod', creditsPaymentMethods.KNET);
  expect(r[2]).toHaveProperty('paymentMethod', creditsPaymentMethods.KNET);
  expect(r[3]).toHaveProperty('paymentMethod', creditsPaymentMethods.CARD);
});

test('round number with decimal precision', () => {
  expect(roundNumber(2.6)).toEqual(3);
  expect(roundNumber(2.6, 2)).toEqual(2.6);
  expect(roundNumber(2.5)).toEqual(3);
  expect(roundNumber(2.4)).toEqual(2);
  expect(roundNumber(2.45, 1)).toEqual(2.5);
  expect(roundNumber(2.45, 2)).toEqual(2.45);
  expect(roundNumber(2.456, 2)).toEqual(2.46);
  expect(roundNumber(2.454, 2)).toEqual(2.45);
  expect(roundNumber('2.454', 2)).toEqual(2.45);
  expect(roundNumber('2.444', 2)).toEqual(2.44);
});
