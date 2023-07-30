module.exports = function InitializationMediator(opts) {

    const { nodeCron, logger } = opts;

    async function initPositionCron() {

        const positionCronSchedule = '0 */12 * * *';

        nodeCron.schedule(positionCronSchedule, sortProducts);

        return true;
    }

    async function initStockCron() {

        const stockCronSchedule = '0 */6 * * *';

        nodeCron.schedule(stockCronSchedule, updateProductsStock);

        return true;
    }

    const updateProductsStock = async function updateProductsStock() {
        //await mdlProductStock.fetchDataAndProcessCSV();
    }

    const sortProducts = async function sortProducts() {
        //await mdlProductSort.sortProducts();
    }

    async function init() {

        await initPositionCron();
        await initStockCron();

        return true;
    }

    return {
        init,
    }
}
