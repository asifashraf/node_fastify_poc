/* eslint-disable camelcase */

module.exports = customers => {
  return [
    {
      customer_group_id: '8326bf8f-5e1d-450a-91f3-d460d96dbe74',
      customer_id: 'a788e584-866d-4eb0-9b05-d3459e05a86c',
    },
    {
      customer_group_id: 'b5c5f20a-aff0-4eb7-80b2-14932cf4781e',
      customer_id: customers[1].id,
    },
    {
      customer_group_id: 'b5c5f20a-aff0-4eb7-80b2-14932cf4781e',
      customer_id: customers[2].id,
    },
    {
      customer_group_id: 'a9170ae7-a213-4066-86e0-85a20be2b194',
      customer_id: 'a788e584-866d-4eb0-9b05-d3459e05a86c',
    },
    {
      customer_group_id: 'a9170ae7-a213-4066-86e0-85a20be2b194',
      customer_id: customers[1].id,
    },
    {
      customer_group_id: 'a9170ae7-a213-4066-86e0-85a20be2b194',
      customer_id: customers[2].id,
    },
  ];
};
