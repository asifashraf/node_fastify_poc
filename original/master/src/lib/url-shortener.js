
const db = require('../../database');
const redis = require('../../redis');
const nanoid = require('nanoid');
const { dynamicLinkConfig } = require('../../config');

const {
    urlShortenerService,
} = require('../../config');

const getShortUrl = (link) => {
    let _link = link;

    try {
        const shortId = nanoid.nanoid(urlShortenerService.shortIdLength);
        const shortUrlTtl = urlShortenerService.shortUrlTtlMinutes * 60;

        db.raw(`INSERT INTO cofe_short_url_logs
            (
                short_id,
                original_url,
                url_ttl
            ) VALUES (?,?,?)`,
            [
                shortId,
                link,
                shortUrlTtl
            ]).then(result => console.log(`UrlShortenerService > Log >`, result))
            .catch(ex => console.error(`UrlShortenerService > Log > Exception >`, ex));

        redis.set(`SHORTENER:${shortId}`, link, 'EX', shortUrlTtl);

        _link = `${urlShortenerService.shortUrlBasePath}/s/${shortId}`;
    } catch (ex) {
        console.error(`UrlShortenerService > Exception >`, ex);
    }

    return { shortLink: _link };
}

const getReferralUrl = (code) => {
    const _link = `${dynamicLinkConfig.host}/home/referral?code=${code}`;
    return getShortUrl(_link);
}

const getGiftCardUrl = (code, name, imageUrl, amount, currency, message) => {
    const _link = `${dynamicLinkConfig.host}/home/redeem?code=${code}`;  
    return getShortUrl(_link);
}
module.exports = {
    getShortUrl,
    getReferralUrl,
    getGiftCardUrl,
}