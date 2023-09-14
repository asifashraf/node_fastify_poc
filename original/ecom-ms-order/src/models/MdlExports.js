module.exports = function MdlExports(opts) {

    const { config, baseModel, guid, _ : { groupBy }, moment, Bull, jsonexport, fs, mdlOrders, mdlUploads, httpRequest, constants } = opts;

    const { redis, cloudfront_url, productModuleUrl } = config;

    const { API_URLS } = constants

    const model = baseModel();

    const { link } = model;

    model.exportAllOrders = async function exportAllOrders(payload) {

        const exportOrders = new Bull('orders-export-job', { redis: { port: redis.port, host: redis.host } });

        exportOrders.add(payload)

        exportOrders.process(15, async (job, done) => {

            try {

                const { id_supplier } = job.data.filters

                let { countryIso } = job.data.filters

                if (!countryIso) job.data.filters.countryIso = 'AE'

                const pagination = job.data.pagination

                const allOrders = []

                for (let index = 0;  ; index++) {

                    job.data.pagination.paginate = true

                    job.data.pagination.perPage = 1000

                    const { pagination: requestPagination, data: orders } = await mdlOrders.getAllOrders(job.data)

                    if (parseInt(requestPagination.currentPage) > parseInt(requestPagination.lastPage))
                        break

                    pagination.currentPage = parseInt(pagination.currentPage) + 1

                    allOrders.push(...orders)

                    if (orders.length <  pagination.perPage)
                        break
                }

                const orderIds = allOrders.map((order) => order.id)

                let products = link
                    .select(
                        'od.id_order',
                        'od.id_supplier',
                        'od.id_product',
                        'od.product_name',
                        'od.product_reference',
                        'od.product_quantity',
                        'od.unit_price_tax_incl',
                        'od.total_price_tax_incl',
                        'oc.waybill_number',
                        'oc.tracking_url',
                        'oc.id_carrier_partner',
                        'od.attributes',
                    )
                    .from('order_details as od')
                    .leftOuterJoin('order_carrier as oc', 'oc.id_order', 'od.id_order')
                    .whereIn('od.id_order', orderIds)

                // for supplier order export case.
                if (id_supplier) {
                    products = products.where('od.id_supplier', id_supplier)
                }

                products = await products

                products = groupBy(products,'id_order')

                let _allOrders = allOrders.map(async (order) => {
                    order.products = products[order.id]

                    return order
                })

                _allOrders = await Promise.all(_allOrders);

                let suppliers = await httpRequest.send({
                    path: `${productModuleUrl}${API_URLS.BULK_SUPPLIERS}`,
                    method: 'POST',
                    params: { id_suppliers: [] },
                    json: true
                });

                if (suppliers.data) {
                    suppliers = groupBy(suppliers.data,'id')
                }

                let deliveryPartners = await mdlOrders.getDeliveryPartner(null, job.data.filters.countryIso)

                deliveryPartners = groupBy(deliveryPartners, 'id')

                let timezone = job.data.timezone || 'Asia/Dubai'

                const structuredData = []
                let _orderDetails = _allOrders.map(async (order) => {

                    let itemCount = 0

                    const structure = {
                        'Item Number': '',
                        'Order ID': '',
                        'Order Reference': '',
                        'Order Create Date': '',
                        'Order Status': '',
                        'Country': '',
                        'City': '',
                        'Customer Name': '',
                        'Customer Email': '',
                        'Customer Phone': '',
                        'Order Total': '',
                        'Product Total': '',
                        'Payment Method': '',
                        'Delivery Option': '',
                        'Delivery Partner': '',
                        'Tracking Number': '',
                        'Tracking Link': '',
                        'Shipping Fees': '',
                        'Shipping Address': '',

                        'Supplier': '',
                        'Item': '',
                        'SKU': '',
                        'Variant': '',
                        'Quantity': '',
                        'Unit Price': '',
                    }

                     // Order Details
                    structure["Order ID"] = order.id
                    structure['Order Reference'] = order.reference
                    structure["Order Create Date"] = moment(order.orderDate).tz(timezone).format('DD/MM/YYYY, LT')
                    structure["Order Status"] = order.orderStatus.state
                    structure["Country"] = job.data.filters.countryIso || 'AE'
                    structure["Customer Name"] = `${order.customerDetails.firstName} ${order.customerDetails.lastName}`
                    structure["Customer Email"] = order.customerDetails.email
                    structure["Customer Phone"] = order.customerDetails.phoneNumber
                    structure["Order Total"] = order.total
                    structure["Payment Method"] = order.payment && order.payment.method ? order.payment.method : 'N/A'
                    structure["Delivery Option"] = order.shipping.method || 'N/A'
                    structure["Shipping Address"] = order.shipping.information
                    structure["Shipping Fees"] = order.deliveryFee
                    structure["City"] = order.shipping.city

                    order.products?.map((product) => {

                        const supplier = suppliers[product.id_supplier] &&
                                            suppliers[product.id_supplier][0] &&
                                                    suppliers[product.id_supplier][0]['meta'] ? suppliers[product.id_supplier][0]['meta']['name'] : 'N/A'

                        const deliveryPartner = deliveryPartners[product.id_carrier_partner] &&
                                                    deliveryPartners[product.id_carrier_partner][0] &&
                                                        deliveryPartners[product.id_carrier_partner][0]['name'] ? deliveryPartners[product.id_carrier_partner][0]['name'] : 'N/A'

                        // Order Products
                        structure["Item Number"] = itemCount = itemCount + 1
                        structure["Supplier"] = supplier
                        structure["Item"] = product.product_name
                        structure["SKU"] = product.product_reference
                        structure["Quantity"] = product.product_quantity
                        structure["Unit Price"] = product.unit_price_tax_incl
                        structure["Product Total"] = product.total_price_tax_incl
                        structure["Tracking Number"] = product.waybill_number || 'N/A'
                        structure["Tracking Link"] = product.tracking_url || 'N/A'
                        structure["Variant"] = product.attributes || '-'
                        structure["Delivery Partner"] = deliveryPartner

                        if (id_supplier) {
                            delete structure["Customer Name"] 
                            delete structure["Customer Email"] 
                            delete structure["Customer Phone"] 
                            delete structure["Order Total"] 
                            delete structure["Product Total"] 
                            delete structure["Payment Method"] 
                            delete structure["Delivery Option"] 
                            delete structure["Delivery Partner"] 
                            delete structure["Tracking Number"] 
                            delete structure["Tracking Link"]
                            delete structure["Tracking Number"]
                            delete structure["Shipping Fees"]
                            delete structure["Shipping Address"] 
                        }
    
                        structuredData.push(JSON.parse(JSON.stringify(structure)))
                    })
                })

                await Promise.all(_orderDetails);

                const email = job.data.user.email

                if (structuredData.length) {
                    const csv = await jsonexport(structuredData)
                    const fileName = `Orders Report - ${guid.v4()}.csv`
                    const folder = 'exports'

                    fs.writeFileSync(fileName, csv);

                    let fileLink = await mdlUploads.upload(fileName, folder)

                    fileLink = fileLink ? `${cloudfront_url}${folder}/${fileLink}` : null

                    let receiverEmails = [ email ];

                    const currentDate = moment().tz(timezone).format('DD/MM/YYYY, LT')

                    const params = {
                        subject: `Export Orders - ${currentDate}`,
                        html: `Hello! Here is your exported report. Please find the link attached and download the report. \n Download Link: ${fileLink}`,
                        receivers: receiverEmails
                    }

                    mdlOrders.sendMail(params)
                }

                done()

            } catch (error) {
                console.log(error,'error')
                done(error)
            }
        })
    }

    return model
}

