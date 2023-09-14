const express = require('express');
const router = express.Router();
const redis = require('../../redis');

router.route('/:shortId').get(async (req, res) => {
    const shortId = req.params.shortId;

    const originalUrl = await redis.get(`SHORTENER:${shortId}`);

    if (originalUrl !== null) return res.redirect(originalUrl);

    return res.status(404).send(`Invalid short url`);
});

module.exports = router;