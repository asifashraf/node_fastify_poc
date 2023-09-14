/* eslint-disable max-params */
const Axios = require('axios');
const { dynamicLinkConfig } = require('../../config');
const axios = Axios.create({
  timeout: 60000,
  headers: { 'content-type': 'application/json' },
});

const getGiftCardUrl = (code, name, imageUrl, amount, currency, message) =>
  axios
    .post(
      `https://firebasedynamiclinks.googleapis.com/v1/shortLinks?key=${dynamicLinkConfig.key}`,
      {
        dynamicLinkInfo: {
          domainUriPrefix: dynamicLinkConfig.uriPrefix,
          link: `${dynamicLinkConfig.host}/home/redeem?code=${code}`,
          androidInfo: {
            androidPackageName: dynamicLinkConfig.androidPackageName,
          },
          iosInfo: {
            iosBundleId: dynamicLinkConfig.iosBundleId,
            iosAppStoreId: dynamicLinkConfig.iosAppStoreId,
          },
          socialMetaTagInfo: {
            socialTitle: 'COFE Gift Card',
            socialDescription: `${name} sent you a ${amount}${currency} gift card. ${
              message ? `Message: ${message}` : ''
            }`,
            socialImageLink: imageUrl,
          },
        },
        suffix: {
          option: 'UNGUESSABLE',
        },
      }
    )
    .then(responce => responce.data)
    .catch(err => {
      throw new Error(err.response);
    });

const getReferralUrl = (code) =>
  axios
    .post(
      `https://firebasedynamiclinks.googleapis.com/v1/shortLinks?key=${dynamicLinkConfig.key}`,
      {
        dynamicLinkInfo: {
          domainUriPrefix: dynamicLinkConfig.uriPrefix,
          link: `${dynamicLinkConfig.host}/home/referral?code=${code}`,
          androidInfo: {
            androidPackageName: dynamicLinkConfig.androidPackageName,
          },
          iosInfo: {
            iosBundleId: dynamicLinkConfig.iosBundleId,
            iosAppStoreId: dynamicLinkConfig.iosAppStoreId,
          },
        },
        suffix: {
          option: 'UNGUESSABLE',
        },
      }
    )
    .then(responce => responce.data)
    .catch(err => {
      throw new Error(err.response);
    });

const getExpressDeliveryTrackingPageShortUrlForRider = async (link) => {
  try {
    const response = await axios.post(
      `https://firebasedynamiclinks.googleapis.com/v1/shortLinks?key=${dynamicLinkConfig.key}`,
      {
        dynamicLinkInfo: {
          domainUriPrefix: dynamicLinkConfig.uriPrefixForShortener,
          link: `${link}`,
        },
        suffix: {
          option: 'SHORT'
        }
      }
    );

    return response.data;
  } catch (err) {
    console.error(err);
    throw new Error(err.response);
  }
};

module.exports = {
  getGiftCardUrl,
  getReferralUrl,
  getExpressDeliveryTrackingPageShortUrlForRider,
};
