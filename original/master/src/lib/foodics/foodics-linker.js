const branches = require('./linkers/branches');
const categories = require('./linkers/categories');
const products = require('./linkers/products');
const orders = require('./linkers/orders');
const sqs = require('../../lib/sqs-base')('to_foodics');
module.exports = function () {
  return (queryContext) => {
    const dataLinkers = {
      'branch': {
        dbContext: queryContext.brandLocation,
        link: branches,
      },
      'category': {
        dbContext: queryContext.menuSection,
        link: categories.link,
        update: categories.update,
      },
      'product': {
        dbContext: queryContext.menuItem,
        link: products.link,
        update: products.update,
      },
      'order': {
        dbContext: queryContext.orderSetStatus,
        update: orders
      }
    };
    async function link({ entity, data }) {
      const dataLinker = dataLinkers[entity] || null;
      if (dataLinker === null) throw new Error(`Tried to load unknown linker for entity [${entity}]`);
      const { action } = data;
      const _action = action || null;
      let result = null;
      if (_action === 'update') {
        result = await dataLinker.update({ data, qContext: queryContext, dbContext: dataLinker.dbContext });
      }
      if (result === null) {
        const { brandId, menuId } = data;
        const brand = await queryContext.brand.getById(brandId);
        const menu = await queryContext.menu.getById(menuId);
        result = await dataLinker.link({ data, dbContext: dataLinker.dbContext, brand, menu, qContext: queryContext });
      }
      if (!result.done) return false;
      const { message, done } = result;
      if (message !== null) await sqs.sendMessage(message, 2);
      return done;
    }
    return {
      link
    };
  };
};
