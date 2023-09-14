const KD = require('./currency');

test('KD can perform arithmetic on floating points', () => {
  const decimals = 3;
  const lowestDenomination = '0.005';
  const kd = new KD(1.05, decimals, lowestDenomination);
  const { value } = kd.add(1.1);

  expect(1.05 + 1.1).toEqual(2.1500000000000004);
  expect(value).toEqual(2.15);
});

test('KD works with strings', () => {
  const decimals = 3;
  const lowestDenomination = '0.005';
  const kd = new KD('1.050', decimals, lowestDenomination);
  const { value } = kd.add('1.100');

  expect(1.05 + 1.1).toEqual(2.1500000000000004);
  expect(value).toEqual(2.15);
});

test('KD chains operations', () => {
  const decimals = 3;
  const lowestDenomination = '0.005';
  const { value } = new KD(1.1, decimals, lowestDenomination)
    .add(1.05)
    .add(1.001)
    .add(2)
    .mult(2);

  expect(value).toEqual(10.302);
});

test('lowest denomination for currency value is 0.005  (KWD)', () => {
  const decimals = 3;
  const lowestDenomination = '0.005';
  const { value: testValue1 } = new KD(
    '2.444',
    decimals,
    lowestDenomination
  ).round();
  expect(testValue1).toEqual(2.445);
  const { value: testValue2 } = new KD(
    '2.445',
    decimals,
    lowestDenomination
  ).round();
  expect(testValue2).toEqual(2.445);
  const { value: testValue3 } = new KD(
    '2.446',
    decimals,
    lowestDenomination
  ).round();
  expect(testValue3).toEqual(2.445);
  const { value: testValue4 } = new KD(
    '2.448',
    decimals,
    lowestDenomination
  ).round();
  expect(testValue4).toEqual(2.45);
  const { value: testValue5 } = new KD(
    '0',
    decimals,
    lowestDenomination
  ).round();
  expect(testValue5).toEqual(0);
});

test('lowest denomination for currency value is 0.25 (AED, SAR)', () => {
  const decimals = 2;
  const lowestDenomination = '0.250';
  const { value: testValue1 } = new KD(
    '2.44',
    decimals,
    lowestDenomination
  ).round();
  expect(testValue1).toEqual(2.5);
  const { value: testValue2 } = new KD(
    '2.20',
    decimals,
    lowestDenomination
  ).round();
  expect(testValue2).toEqual(2.25);
  const { value: testValue3 } = new KD(
    '2.15',
    decimals,
    lowestDenomination
  ).round();
  expect(testValue3).toEqual(2.25);
  const { value: testValue4 } = new KD(
    '2.63',
    decimals,
    lowestDenomination
  ).round();
  expect(testValue4).toEqual(2.75);
  const { value: testValue5 } = new KD(
    '0',
    decimals,
    lowestDenomination
  ).round();
  expect(testValue5).toEqual(0);
});
