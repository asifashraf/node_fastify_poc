const express = require('express');
const router = express.Router();
const { basePath } = require('../../config');

const path = require('path');

router.route('/rider').get(async (req, res) => {

    const trackingPagePath = path.join(__dirname, '../static', 'tracking-page.html');

    res.render(trackingPagePath, { API_URL: basePath });

});

module.exports = router;