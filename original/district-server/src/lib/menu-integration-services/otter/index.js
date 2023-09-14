const adapter = require('../adapter');
const { otterConfig } = require('../../../../config');
const otterApiHelper = require('./helpers/api-helper')(otterConfig);
const AxiosHttp = require('../network');

const CategoriesDataDecorator = require('./decorators/CategoriesDataDecorator');
const ProductsDataDecorator = require('./decorators/ProductsDataDecorator');

module.exports = function OtterIntegrationService(queryContext) {
  const otterAdapter = adapter({ baseUrl: 'https://api.staging.tryotter.com' })('otter');

  otterAdapter.auth = function auth() {
    try {
      const response = AxiosHttp.send(`${this.baseUrl}/v1/auth/token`, otterApiHelper.authRequestOptions());

      return response.data;
    } catch (err) {
      console.error('otterAdapter > function > otterAuth > Error: ', err);
      throw new Error(err.response);
    }
  };

  otterAdapter.menuWebhook = async function menuWebhook(context, payload) {
    console.log('Turbo > file: index.js:24 > menuWebhook > payload:', payload);
    console.log(`otterMenuWebhook > function > otterMenuWebhook`);

    try {
      const decorateCategoriesData = CategoriesDataDecorator().decorateCategoriesData;
      const decorateProductsData = ProductsDataDecorator().decorateProductsData;

      const { menus, categories, items: products } = payload.metadata.payload.menuData;
      const _menus = Object.values(menus);

      const decoratedCategoriesForDb = decorateCategoriesData(Object.values(categories), _menus[0]);
      console.log('menuWebhook > decoratedCategoriesForDb:', decoratedCategoriesForDb);

      const validate = await context.menuSection.validate(decoratedCategoriesForDb);
      const { errors } = validate;
      if (errors && errors.length > 0) {
        console.error('Otter-Category-Save > Errors >', errors);
        throw new Error('Otter-Category-Save Decorator Validation Failed');
      }
      const [categoryId] = await context.menuSection.save(decoratedCategoriesForDb);

      // const categoryId = 'b01485b0-034a-47c5-8a0a-0eeca08bf994'; // testing

      // console.log('menuWebhook > products:', products);
      // const _products = Object.values(products);
      const decoratedProductsForDb = decorateProductsData(payload, categoryId);
      console.log('menuWebhook > decoratedProductsForDb:', decoratedProductsForDb);
      // // // await saveProducts({ data: decoratedProductsForDb });

      return payload;
    } catch (err) {
      console.error('otterAdapter > function > otterMenuWebhook > Error: ', err);
      throw new Error(err.response);
    }
  };

  return otterAdapter;
};
