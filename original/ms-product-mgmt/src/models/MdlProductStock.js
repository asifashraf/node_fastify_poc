module.exports = function MdlProductStock(opts) {

    const { config, baseModel, https } = opts;

    const { default_uuid } = config;

    const model = baseModel('products');

    const { link } = model;

    const batchSize = 1000;

    model.fetchDataAndProcessCSV = async function fetchDataAndProcessCSV() {
      
        const suppliers = await link.select('id', 'feed_url as url').from('suppliers')
                    .whereNotNull('feed_url')

        const results = { data: [] };

        for (const supplier of suppliers) {
         
            try {

                const supplierFeedUrl = supplier.url;
         
                const supplierId = supplier.id;
      
                const stockData = await this.fetchStockData(supplierFeedUrl);
            
                await link.transaction(async (trx) => {
                    await this.updateStockInDatabase(stockData, supplierId, trx);
                });

                results.data.push({ id: supplierId, url: supplierFeedUrl, success: true });
          
            } 
            catch (error) {
                throw new Error(error.message)
            }
        
        }
      
        return results;
    };
      
    model.fetchStockData = async function fetchStockData(url) {
    
        return new Promise((resolve, reject) => {
    
            https.get(url, (res) => {
                
                let data = '';
        
                res.on('data', (chunk) => {
                    data += chunk;
                });
        
                res.on('end', () => {
                    resolve(data);
                });
        
                res.on('error', (error) => {
                    reject(new Error(`Error retrieving file: ${error.message}`));
                });
            
            });
    
        });
    }
     
    model.updateStockInDatabase = async function updateStockInDatabase(csvData, supplierId, trx) {
        try {
          
            const lines = csvData.split('\n');
          
            // Divide the lines into batches          
            const batches = [];
          
            for (let i = 0; i < lines.length; i += batchSize) {
                const batch = lines.slice(i, i + batchSize);
                batches.push(batch);
            }
      
            // Process the batches in parallel    
            const batchPromises = batches.map((batch) => {

                console.log("==== Batch ====", batch)

                return this.processBatch(batch, supplierId, trx);
            });
      
            await Promise.all(batchPromises);
        } 
        catch (error) {
            console.error('An error occurred:', error);
        }
      
    };

    model.processBatch = async function processBatch(batch, supplierId, trx) {

        const promises = batch.map(async (line) => {

            const values = line.split(',').map((value) => value.replace(/^"|"$/g, ''));

            const partner_sku = values[0];

            const stock_gross = values[1];

            const productDetails = await this.getProductIds(partner_sku, trx);

            if (productDetails) {

                let checkProductStock = await trx    
                    .from('product_stock')
                    .where({ id_product: productDetails.id_product, id_product_attribute: productDetails.id_product_attribute, id_supplier: supplierId })
                    .first('id', 'quantity');   

                console.log("current stock : ", checkProductStock);

                if (checkProductStock && stock_gross !== undefined) {

                    const [updated] = await trx('product_stock').update({ quantity: stock_gross })
                        .where({ id: checkProductStock.id }).returning('*');

                    console.log("update : ", updated);
                }

            }
        });
      
        // Limit concurrency to avoid overwhelming the system

        const lineSize = 10;

        const batches = Array.from({ length: Math.ceil(promises.length / lineSize) }, (_, i) =>
            promises.slice(i * lineSize, (i + 1) * lineSize)
        );
      
        for (const batch of batches) {
            await Promise.allSettled(batch);        
        }
    };

    model.getProductIds = async function getProductIds(sku, trx) {
    
        const product = { data: null };
    
        let checkProduct = await trx    
            .from('products as p')
            .where('p.reference', sku)
            .first('p.id', 'p.is_varianted');
    
        if (checkProduct && checkProduct.is_varianted === false) {
 
            product.data = { id_product: checkProduct.id, id_product_attribute: default_uuid };
 
        } else {

            let checkProductAttribute = await trx
                .from('product_attributes as pa')
                .where('pa.reference', sku)
                .first('pa.id', 'pa.id_product');

            if (checkProductAttribute) {        
                product.data = { id_product: checkProductAttribute.id_product, id_product_attribute: checkProductAttribute.id };
            }
        }

        return product.data;    
    };

    return model;
}