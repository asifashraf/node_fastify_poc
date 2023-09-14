let responceType = null;
const axios = require('axios');
const setNextResponce = stub => {
  responceType = stub;
};
const stubs = {
  success: {
    fail: false,
    data: {
      data: {
        IsSuccess: true,
        Message: 'Invoice Created Successfully!',
        ValidationErrors: null,
        Data: {
          InvoiceId: 1,
          IsDirectPayment: true,
          PaymentURL: 'https://payment.service.com/pay-url',
          CustomerReference: 'ref 1',
          UserDefinedField: 'Custom field',
        },
      },
    },
  },
  httpError: {
    fail: true,
    data: {
      response: {
        status: 514,
        statusText: 'Houston We have an Error',
      },
    },
  },
  badRequest: {
    fail: false,
    data: {
      data: {
        IsSuccess: false,
        Message: 'Bad Request',
        ValidationErrors: [
          { Name: 'InvoiceValue', Error: 'Invoice value must be more than 0' },
        ],
        Data: null,
      },
    },
  },
};
const realMf = require('./my-fatoorah');
const executePayment = (...args) => {
  axios.post = jest
    .fn()
    .mockImplementation(() =>
      (stubs[responceType].fail
        ? Promise.reject(stubs[responceType].data)
        : Promise.resolve(stubs[responceType].data))
    );
  return realMf.executePayment(...args);
};

module.exports = {
  executePayment,
  setNextResponce,
};
