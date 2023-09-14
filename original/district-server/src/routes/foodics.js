const express = require('express');
const router = express.Router();
const { foodics } = require('../../config');
const axiosAdapter = require('../lib/axios-adapter');
const redis = require('../../redis');

router.route('/redirect').get(async (req, res) => {
  const { queryContextWithoutAuth: context } = req.app;
  try {
    const { code, state } = req.query;
    const brandDetails = await context.brand.getById(state);
    const menu = await context.menu.getByBrand(state);
    if (brandDetails) {
      /*const wasConnected = await redis.get(`foodics_brand_${brandDetails.id}`);
      if (wasConnected != null) {
        return res.redirect(`${foodics.successUrl}?message=Already+connected&code=200`)
      }*/
      const data = {
        code,
        brandId: brandDetails.id,
        menuId: menu.id
      };

      const syncInProgress = await redis.get(`foodics:linking:${data.brandId}`);

      if (syncInProgress === 'started') {
        return res.redirect(`${foodics.successUrl}&inprogress=true`);
      }

      const connect = await axiosAdapter.send({
        path: foodics.authUrl,
        method: 'POST',
        params: data,
        json: true
      });
      if (connect && connect.data.code > 201) {
        return res.status(400).send(connect.data.message);
      }
      if (connect.data.code == 200) {
        const { sync } = connect.data.data;
        if (sync) {
          axiosAdapter.send({
            path: foodics.createDataLinks,
            method: 'POST',
            params: {
              brandId: brandDetails.id,
              menuId: menu.id
            },
            json: true
          });
        }
      }
      return res.redirect(`${foodics.successUrl}`);
    } else {
      return res.redirect(`${foodics.failureUrl}`);
    }
  } catch (error) {
    return res.redirect(`${foodics.failureUrl}`);
  }
});

module.exports = router;
