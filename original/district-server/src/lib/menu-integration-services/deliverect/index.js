const adapter = require('../adapter');
const { deliverectConfig } = require('../../../../config');
const deliverectApiHelper = require('./helpers/api-helper')(deliverectConfig);
const AxiosHttp = require('../network');
const { saveAuthToken } = require('../helpers/redis-helper');

const { decorateCategoriesData } = require('./decorators/CategoriesDataDecorator');
const { decorateProductsData } = require('./decorators/ProductsDataDecorator');
const { decorateProductModifierGroups } = require('./decorators/ModifierGroupsDataDecorator');

module.exports = function DeliverectIntegrationService() {
  const deliverectAdapter = adapter({ baseUrl: 'https://api.staging.deliverect.com' })('deliverect');

  const headers = { 'content-type': 'application/json' };

  deliverectAdapter.auth = async function auth() {
    console.log(`deliverectAuth > function > deliverectAuth`);

    try {
      const response = await AxiosHttp.send({
        path: `${this.baseUrl}/oauth/token`,
        params: deliverectApiHelper.authRequestOptions(),
      });

      // const response = await HttpRequest.send({
      //   path: `${this.baseUrl}/oauth/token`,
      //   headers,
      //   method: 'post',
      //   params: deliverectApiHelper.authRequestOptions(),
      // });

      console.log('index.js > auth > response:', response);
      // save authentication token in redis
      saveAuthToken('menuAuthenticationToken', response.data);
      return response.data;
    } catch (err) {
      console.error('deliverectAdapter > function > deliverectAuth > Error: ', err);
      throw new Error(err.response);
    }
  };

  deliverectAdapter.menuWebhook = async function menuWebhook(payload) {
    console.log(`deliverectMenuWebhook > function > deliverectMenuWebhook`);

    try {
      const { categories, products, modifierGroups } = payload[0];

      const decoratedCategoriesForDb = decorateCategoriesData({ categories });
      // await saveCategories({ data: decoratedCategoriesForDb });

      const _products = Object.values(products);
      const decoratedProductsForDb = decorateProductsData(_products);
      // await saveProducts({ data: decoratedProductsForDb });

      const productModifierGroups = await Promise.all(
        _products.map(async (product) => {
          const modifierGroupsIds = product.subProducts;
          if (modifierGroupsIds.length > 0) {
            const decoratedModifierGroupsForDb = decorateProductModifierGroups({
              modifierGroupsIds,
              modifierGroups,
              product_id: product._id,
            });

            // const saved = await saveModifierGroups({ data: decoratedModifierGroupsForDb });
            return {
              modifierGroups: decoratedModifierGroupsForDb,
              ...product,
            };
          }

          return false;
        })
      );

      console.log('Turbo > file: index.js:79 > menuWebhook > productModifierGroups:', productModifierGroups);

      return payload;
    } catch (err) {
      console.error('deliverectAdapter > function > deliverectMenuWebhook > Error: ', err);
      throw new Error(err.response);
    }
  };

  return deliverectAdapter;
};
