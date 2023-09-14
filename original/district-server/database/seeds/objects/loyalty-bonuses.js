/* eslint-disable camelcase */
const casual = require('casual');

module.exports = () => [
  {
    id: casual.uuid,
    loyalty_tier_id: '3eb0b216-389b-11eb-adc1-0242ac120002', // GreenUAE
    type: 'percent',
    value: 10,
    lower_bound: 100,
    upper_bound: 100,
    created: new Date(),
    updated: new Date(),
  },
  {
    id: casual.uuid,
    loyalty_tier_id: '3eb0b090-389b-11eb-adc1-0242ac120002', // GoldUAE
    type: 'flat',
    value: 15,
    lower_bound: 200,
    upper_bound: 200,
    created: new Date(),
    updated: new Date(),
  },
  {
    id: casual.uuid,
    loyalty_tier_id: '3eb0af5a-389b-11eb-adc1-0242ac120002', // BlackUAE
    type: 'percent',
    value: 12,
    lower_bound: 300,
    upper_bound: 300,
    created: new Date(),
    updated: new Date(),
  },
  {
    id: casual.uuid,
    loyalty_tier_id: '3eb0abea-389b-11eb-adc1-0242ac120002', // CustomUAE
    type: 'flat',
    value: 10,
    lower_bound: 1,
    upper_bound: 199,
    created: new Date(),
    updated: new Date(),
  },
  {
    id: casual.uuid,
    loyalty_tier_id: '3eb0abea-389b-11eb-adc1-0242ac120002', // CustomUAE
    type: 'flat',
    value: 8,
    lower_bound: 200,
    upper_bound: 299,
    created: new Date(),
    updated: new Date(),
  },
  {
    id: casual.uuid,
    loyalty_tier_id: '3eb0abea-389b-11eb-adc1-0242ac120002', // CustomUAE
    type: 'percent',
    value: 3,
    lower_bound: 300,
    upper_bound: null,
    created: new Date(),
    updated: new Date(),
  },
];
