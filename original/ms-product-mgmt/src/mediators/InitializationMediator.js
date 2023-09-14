module.exports = function InitializationMediator(opts) {

    const { nodeCron, mdlProductFeeds, mdlProductSort, mdlProductStock } = opts;

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

    async function initProductFeedsCron() {
        
        console.log("inititalize feeds")

        const feedsCronSchedule = '* * * * *';

        nodeCron.schedule(feedsCronSchedule, generateProductFeed);

        return true;
    }

    const updateProductsStock = async function updateProductsStock() {
        await mdlProductStock.fetchDataAndProcessCSV();
    }

    const sortProducts = async function sortProducts() {
        await mdlProductSort.sortProducts();
    }

    const generateProductFeed = async function generateProductFeed() {
        await mdlProductFeeds.generateProductXmlFeed();
    }

    async function init() {

        await initPositionCron();
        await initStockCron();
        await initProductFeedsCron();
      
        return true;
    }

    return {
        init,
    }
}