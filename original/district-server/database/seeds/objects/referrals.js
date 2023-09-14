/* eslint-disable camelcase */

module.exports = customers => {
  return [
    {
      id: '049bcc6b-74da-4820-bf38-5ebba6973068',
      sender_id: customers[0].id,
      receiver_id: customers[1].id,
      sender_amount: 2.5,
      receiver_amount: 2,
      status: 'ORDERED',
      joined_at: '2020-02-01 20:32:09',
      received_at: '2020-02-01 21:35:09',
      sender_currency_id: 'f216d955-0df1-475d-a9ec-08cb6c0f92bb',
      receiver_currency_id: 'f216d955-0df1-475d-a9ec-08cb6c0f92bb',
    },
    {
      id: '18c29a5d-68fe-42e6-ad8e-3b54e3edc636',
      sender_id: customers[1].id,
      receiver_id: customers[2].id,
      sender_amount: 2.5,
      receiver_amount: 2,
      status: 'JOINED',
      joined_at: '2020-02-01 20:32:09',
      received_at: null,
      sender_currency_id: 'f216d955-0df1-475d-a9ec-08cb6c0f92bb',
      receiver_currency_id: 'f216d955-0df1-475d-a9ec-08cb6c0f92bb',
    },
    {
      id: '67b76649-19b0-4c6e-be52-9b07e880a28d',
      sender_id: customers[0].id,
      receiver_id: customers[3].id,
      sender_amount: 2.5,
      receiver_amount: 2,
      status: 'ORDERED',
      joined_at: '2020-02-01 21:32:09',
      received_at: '2020-02-01 22:35:09',
      sender_currency_id: 'f216d955-0df1-475d-a9ec-08cb6c0f92bb',
      receiver_currency_id: 'f216d955-0df1-475d-a9ec-08cb6c0f92bb',
    },
  ];
};
