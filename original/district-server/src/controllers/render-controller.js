const {
  renderConfirmationEmail: orderSetRender,
} = require('../schema/order-set/email-confirmation-renderer');
const {
  renderConfirmationEmail: loyaltyOrderRender,
} = require('../schema/loyalty-order/email-confirmation-renderer');
const { map } = require('lodash');

exports.renderNonProdEmails = async ({ app, query }, res) => {
  const { queryContextWithoutAuth } = app;
  const { referenceOrderId, render, model } = query;

  if (referenceOrderId) {
    const paymentStatusName = 'PAYMENT_SUCCESS';
    const knetResponse = {
      paymentid: '1012436440373540',
      result: 'CAPTURED',
      auth: '490966',
      ref: '735403423488',
      tranid: '5989611450373540',
      postdate: '1220',
      trackid: 'test',
      responsecode: '00',
      eci: '7',
    };

    let rendering;
    if (model === 'orderSet') {
      rendering = await orderSetRender(
        queryContextWithoutAuth,
        referenceOrderId,
        paymentStatusName,
        knetResponse
      );
    } else if (model === 'loyaltyOrder') {
      rendering = await loyaltyOrderRender(
        queryContextWithoutAuth,
        referenceOrderId,
        paymentStatusName,
        knetResponse
      );
    }

    if (render === 'html' || render === 'text') {
      res.send(rendering[render]);
    } else {
      res.send('nothing to render');
    }
  } else {
    // No Order Set ID
    const list = await queryContextWithoutAuth[model].getAll();
    const htmlList = map(
      list,
      o =>
        `<a href="/render-email?referenceOrderId=${o.id}&render=html&model=${model}">${o.id}</a>`
    ).join('<br>');
    res.send(htmlList);
  }
};
