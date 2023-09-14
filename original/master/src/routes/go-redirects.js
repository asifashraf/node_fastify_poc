const express = require('express');
const router = express.Router();
const { expressDelivery } = require('../../config');
const { redirectionCodes } = require('../schema/root/enums');


router.route('').get(async (req, res) => {
  try {
    const c = req.query.c;
    if (c) {
      delete req.query.c;
    }
    switch (c) {
      case redirectionCodes.EXPRESS_DELIVERY_TRACKING_PAGE_URL:
        return expressDeliveryRedirection(req, res);
    }
    throw new Error('Unhandled Redirection');
  } catch (error) {
    return res
      .status(500)
      .json({
        success: false,
        message: 'Internal Server Error'
      });
  }
});

const expressDeliveryRedirection = (req, res) => {
  const baseUrl = expressDelivery.riderUrl;
  const url = new URL(baseUrl);
  url.searchParams.set('token', req.query.token || 'none');
  url.searchParams.set('l', req.query.l || 'en');
  res.redirect(url.toString());
};

module.exports = router;
