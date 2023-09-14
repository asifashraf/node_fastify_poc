/* eslint-disable camelcase */
const casual = require('casual');

const {
  paymentProvider,
  customerCardTokenStatus,
} = require('../../../src/schema/root/enums');

module.exports = customers => {
  return [
    {
      id: casual.uuid,
      type: 'card',
      source_token: 'src_bcscergr76mutaotdcj7nmyouy',
      customer_token: 'cus_j33vqh4ykvtufdzxjn655mpyle',
      customer_id: customers[0].id,
      expiry_month: 1,
      expiry_year: 2025,
      name: 'FRODO BAGGINS',
      scheme: 'Visa',
      last_4: '4242',
      bin: '424242',
      card_type: 'Credit',
      card_category: 'Consumer',
      issuer: 'JPMORGAN CHASE BANK NA',
      issuer_country: 'US',
      product_id: 'A',
      product_type: 'Visa Traditional',
      payment_provider: paymentProvider.CHECKOUT,
      status: customerCardTokenStatus.ACTIVE,
      is_default: false,
      provider_raw:
        '{"id":"pay_zpkiwhfoybouzakqtl6bn5nwci","action_id":"act_zpkiwhfoybouzakqtl6bn5nwci","amount":0,"currency":"USD","approved":true,"status":"Card Verified","auth_code":"834087","eci":"05","scheme_id":"823648998376693","response_code":"10000","response_summary":"Approved","risk":{"flagged":false},"source":{"id":"src_bcscergr76mutaotdcj7nmyouy","type":"card","expiry_month":1,"expiry_year":2025,"name":"AUREL STOCHECI","scheme":"Visa","last4":"4242","fingerprint":"471D238919B1285DC1DE71C885C1FBD3106E71E89E54B9386DB766F0F431C55B","bin":"424242","card_type":"Credit","card_category":"Consumer","issuer":"JPMORGAN CHASE BANK NA","issuer_country":"US","product_id":"A","product_type":"Visa Traditional","avs_check":"S","cvv_check":"Y","payouts":true,"fast_funds":"d"},"customer":{"id":"cus_j33vqh4ykvtufdzxjn655mpyle"},"processed_on":"2020-03-06T12:04:58Z","processing":{"acquirer_transaction_id":"6114117204","retrieval_reference_number":"282454288623"},"_links":{"self":{"href":"https://api.sandbox.checkout.com/payments/pay_zpkiwhfoybouzakqtl6bn5nwci"},"actions":{"href":"https://api.sandbox.checkout.com/payments/pay_zpkiwhfoybouzakqtl6bn5nwci/actions"}},"requiresRedirect":false}',
    },
    {
      id: casual.uuid,
      type: 'card',
      source_token: 'src_hwmxidr6t7du3edzgu2leoma6i',
      customer_token: 'cus_j33vqh4ykvtufdzxjn655mpyle',
      customer_id: customers[0].id,
      expiry_month: 1,
      expiry_year: 2025,
      name: 'FRODO BAGGINS',
      scheme: 'Mastercard',
      last_4: '6378',
      bin: '543603',
      card_type: 'Credit',
      card_category: 'Consumer',
      issuer: 'STATE BANK OF MAURITIUS, LTD.',
      issuer_country: 'MU',
      product_id: 'MCC',
      product_type: 'MasterCard® Credit Card (mixed BIN)',
      payment_provider: paymentProvider.CHECKOUT,
      status: customerCardTokenStatus.INACTIVE,
      is_default: true,
      provider_raw:
        '{"id":"pay_vznk5yoei3cepbqfk7lpr37rty","action_id":"act_vznk5yoei3cepbqfk7lpr37rty","amount":0,"currency":"USD","approved":true,"status":"Card Verified","auth_code":"785307","eci":"05","scheme_id":"113171616067495","response_code":"10000","response_summary":"Approved","risk":{"flagged":false},"source":{"id":"src_hwmxidr6t7du3edzgu2leoma6i","type":"card","expiry_month":1,"expiry_year":2025,"name":"AUREL STOCHECI","scheme":"Mastercard","last4":"6378","fingerprint":"5B30F68AA9414DA4CFAAA9F3444E13E4F4904FE9C1125157ACFE7BA8E03FD7DA","bin":"543603","card_type":"Credit","card_category":"Consumer","issuer":"STATE BANK OF MAURITIUS, LTD.","issuer_country":"MU","product_id":"MCC","product_type":"MasterCard® Credit Card (mixed BIN)","avs_check":"S","cvv_check":"Y"},"customer":{"id":"cus_j33vqh4ykvtufdzxjn655mpyle"},"processed_on":"2020-03-06T11:51:03Z","processing":{"acquirer_transaction_id":"1173442821","retrieval_reference_number":"421938120625"},"_links":{"self":{"href":"https://api.sandbox.checkout.com/payments/pay_vznk5yoei3cepbqfk7lpr37rty"},"actions":{"href":"https://api.sandbox.checkout.com/payments/pay_vznk5yoei3cepbqfk7lpr37rty/actions"}},"requiresRedirect":false}',
    },
  ];
};
