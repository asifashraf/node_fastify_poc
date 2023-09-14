module.exports = function MdlOrders(opts) {

    const { config, baseModel, knexnest, guid, constants, httpRequest, Boom, _ : { groupBy, uniqBy, map, uniq, union }, moment,
        puppeteer, handlebars, path, fs, QRCode, formData, mdlProductStatus, i18n, logger, Aws, language } = opts;

    const model = baseModel('orders');

    const { link } = model;

    const { coreModuleUrl, cartModuleUrl, discountModuleUrl, productModuleUrl, default_uuid, default_image_url,
        languages, deliveryModuleUrl, cloudfront_url, cofeDistrictUrl, serviceExchangeKey, product_bucket,
        completedStateIds, notificationStates, timezone, failureStateIds, paymentIcons, deepLink, slackOrderHooks, sesKeys, orderNotificationEmailSender, cofeSupportEmail,
        cofeSupportPhone, cofeOperationsEmailKSA, cofeOperationsEmailUAE,
        cofeOperationsEmailKWT, cofePortalUrl, applePayKuwait, backofficeModuleUrl, tabbyUrl, tabbySecretKey, 
        cofeSuppliers, portalUrl, supplierSMS, websiteBaseUrl } = config;

    const { API_URLS, MARKETPLACE_ORDER_DETAIL } = constants;

    const { translate } = language

    model.placeOrder = async function placeOrder(order, i8ln) {

        let { id_cart, device_type, payment_method: payment_method, notes, sourceId, cvv, use_credit } = order;

        const { locale, countryIso, cofeCustomerToken, id_lang, city } = i8ln;

        const customer = await this.autheticateCustomer(cofeCustomerToken);

        if (!customer.data)
            return customer;

        let walletAmount = 0;
        let creditsUsed = 0;

        const { id, phone_number, cofe_reference_id } = customer.data;

        let id_customer = id;

        let vat_rate = 0;

        let countries = await this.getCountries([countryIso]);

        if (countries)
            vat_rate = countries[0].vatRate;

        const cart = await this.getCart(id_cart, countryIso, 'en', city);

        if (!cart)
            throw Error(`Invalid Cart Id.`)

        if (cart.removedItems?.length)
            throw Error(`${cart.removedItems[0].product.name} is not available.`)

        if (cart.cartRule?.length) {
            const rules = cart.cartRule;

            for (let rule of rules) {
                const cartRule = await this.getCartRule(rule.id, 'en');

                if (!cartRule)
                    throw Error(`${rule.name} is disabled, please proceed after removing the coupon`)

                const timeFormat = 'YYYY-MM-DD HH:mm:ss'

                let dateFrom = moment(cartRule.date_from).format(timeFormat)
                let dateTo =   moment(cartRule.date_to).format(timeFormat)

                const now = moment().format(timeFormat)

                if(!moment(now).isBetween(dateFrom, dateTo))
                    throw Error(`${cartRule.name} validity has been expired, please proceed after removing the coupon`)
            }
        }

        payment_method = payment_method.toUpperCase();

        let currentState = await link.from('order_states').where('name', 'Payment In Process').first('id', 'name')

        if (['CASH', 'CREDIT', 'GOOGLE_PAY'].includes(payment_method))
            currentState = await link.from('order_states').where('name', 'Process In Progress').first('id', 'name')

        if (!cart.idAddressDelivery)
            throw Error(`please select your address to place an order.`)

        const address = await this.getAddress(cart.idAddressDelivery);

        let codFee = 0;

        if (['CASH'].includes(payment_method))
            codFee = countries[0].codFee;

        const createdOrder = await this.createOrder(cart, customer, currentState, address, countryIso, notes, id_lang, codFee);

        const { id: orderId, reference, total_products_tax_incl, total_shipping_tax_incl,
            total_discounts_tax_incl, total_paid_tax_incl, eta, eta_last_date } = createdOrder;

        let discountCode = null;

        if (cart.cartRule?.length) {

            const rules = cart.cartRule;

            let insertedRules = [];

            for (let rule of rules) {

                let reductionAmountTaxExcl = 0;
                let reductionAmountTaxIncl = 0;

                if (rule.reductionType == 'percentage') {
                   reductionAmountTaxExcl = (rule.reductionValue / 100) * cart.totalAmountTaxExcl;
                   reductionAmountTaxIncl = (rule.reductionValue / 100) * cart.totalAmount;
                } else {
                    let taxAmount = (vat_rate / 100) * rule.reductionValue;
                    reductionAmountTaxExcl = rule.reductionValue;
                    reductionAmountTaxIncl = Number(rule.reductionValue) + taxAmount;
                }

                insertedRules.push({
                    id: guid.v4(),
                    id_order: orderId,
                    id_cart_rule: rule.id,
                    code: rule.code,
                    reduction_type: rule.reductionType,
                    cart_rule_amount_tax_excl: reductionAmountTaxExcl,
                    cart_rule_amount_tax_incl: reductionAmountTaxIncl
                })

                discountCode = rule.code;
            }

            await link('order_cart_rule').insert(insertedRules)
        }

        await link('order_device_type').insert({
            id: guid.v4(),
            id_order: orderId,
            device_type
        })

        const cardIcons = [paymentIcons[payment_method]];

        if (use_credit) {
            const customerWalletAmount = await this.customerWallet(cofeCustomerToken, countryIso);
            walletAmount = (customerWalletAmount) ? parseFloat(customerWalletAmount.data.totalAmount) : 0

            if (walletAmount > parseFloat(total_paid_tax_incl)) {
                creditsUsed = parseFloat(total_paid_tax_incl);
            } else if (walletAmount <= parseFloat(total_paid_tax_incl)) {
                creditsUsed = walletAmount;
            }

            if (payment_method !== 'CREDIT')
                cardIcons.push(paymentIcons.CREDIT)
        }

        await link('order_payment').insert({
            id: guid.v4(),
            id_order: orderId,
            currency: countries[0].currency.symbol,
            amount: cart.finalAmount,
            credit_used: creditsUsed,
            payment_method
        })

        await link('order_carrier').insert({
            id: guid.v4(),
            id_order: orderId,
            id_carrier: cart.idCarrier,
            shipping_amount_tax_excl: cart.shippingAmountTaxExcl,
            shipping_amount_tax_incl: cart.shippingAmount
        })

        const orderProducts = await this.createOrderProducts(orderId, cart, vat_rate);

        await link('order_history').insert({
            id: guid.v4(),
            id_order: orderId,
            id_employee: default_uuid,
            id_order_state: currentState.id
        })

        let orderedItems = cart.cartItems.map(({quantity, product: {name, reference, finalPrice, productImage, attributes}})=>{
            return {name, reference, finalPrice, productImage, attributes, quantity};
        });

        let amountDue = parseFloat(total_paid_tax_incl) - creditsUsed;

        let response = { id: orderId, reference, address: address.address,
            etaDate: eta, etaLastDate: eta_last_date, subTotal: parseFloat(total_products_tax_incl), deliveryFee: parseFloat(total_shipping_tax_incl),
            reductionAmount: parseFloat(total_discounts_tax_incl), discountCode, totalAmount: parseFloat(total_paid_tax_incl), currency: countries[0].currency.symbol,
            paymentType: payment_method, orderedItems, notes, vat: vat_rate, cardIcons, creditsUsed, amountDue,
            taxInvoice: `${cloudfront_url}taxInvoices/${reference}.pdf`, codFee, card: null, orderStatus: currentState.name };

        const data = {"deeplink": `${deepLink}order?id=${orderId}`, orderId}

        const emailsPayload = { createdOrder, address, customer: customer.data, paymentMethod: payment_method, id_lang, cartItems: cart.cartItems, data }

        if (['SAVED_CARD', 'CARD', 'KNET', 'APPLE_PAY'].includes(payment_method) || use_credit) {

            let paymentType = payment_method;

            if (['TABBY'].includes(payment_method)) {               
                response = { id: orderId, paymentMethod: payment_method }
                return { data: response }
            }

            if (['SAVED_CARD', 'KNET', 'APPLE_PAY'].includes(payment_method))
                paymentType = "CARD";

            let checkoutPayload = {
                payment: {
                    paymentType, paymentScheme: payment_method, sourceId, cvv,
                    totalAmount: parseFloat(total_paid_tax_incl), amountDue,
                    isoCurrencyCode: countries[0].currency.symbol, isoCountryCode: countryIso
                }, metadata: {
                    language: locale, orderSource: 'Mobile', creditsUsed, referenceOrderId: orderId,
                    externalCustomerId: id_customer, internalCustomerId: cofe_reference_id,
                    customerPhoneNumber: phone_number
                }
            }

            if (checkoutPayload.payment['sourceId'] === undefined)
                delete checkoutPayload.payment['sourceId'];

            if (checkoutPayload.payment['cvv'] === undefined)
                delete checkoutPayload.payment['cvv'];

            const checkoutResponse = await this.checkoutPayment(checkoutPayload);

            logger.info(checkoutResponse, `Payment Controller Response >`);

            if (['SAVED_CARD', 'CARD', 'KNET', 'APPLE_PAY'].includes(payment_method)) {

                const { payment } = checkoutResponse;

                if (sourceId && sourceId !== applePayKuwait) {

                    if (payment_method === 'SAVED_CARD' || payment_method === 'APPLE_PAY') {
                        await link('order_payment_transaction').insert({
                            id: guid.v4(),
                            id_order: orderId,
                            transaction_id: payment.rawResponse.id,
                            payment_reference: payment.rawResponse.reference,
                            approved: payment.approved,
                            amount: amountDue,
                            currency: countries[0].currency.symbol,
                            payment_status: payment.rawResponse.status,
                            customer_id: payment.rawResponse.customer.id,
                            customer_name: payment.rawResponse.customer.name,
                            customer_email: payment.rawResponse.customer.email
                        })
                    }

                    if (payment_method === "APPLE_PAY" && payment.rawResponse) {

                        payment.referenceOrderId = orderId;
                        payment.paymentStatus = checkoutResponse.status;

                        const appleResponse = await this.paymentCallBack(payment, emailsPayload);

                        if (appleResponse.data.redirect === "cofeecom://failure") {
                            response = { id: orderId, paymentUrl: payment.paymentUrl }
                        }

                    } else {
                        response = { id: orderId, paymentUrl: payment.paymentUrl }
                    }

                }

            } else {

                if (payment_method === 'TABBY') {
                    response = { id: orderId, paymentMethod: payment_method }
                    return { data: response }
                
                } else {
                    await link('orders')
                        .update({ current_state: currentState.id, payment_status: 'Payment Accepted', is_valid: true })
                        .where({ id: orderId })
                        .returning('*')
                }

                // invalidate Cart
                await this.invalidateCart(id_cart);
                // Update Products Current Stock
                await this.updateProductsStock(cart.cartItems);

                /** push and slack notifications for wallet*/

                const notification = {
                    "heading" : {
                        "en": i18n.getCatalog('en').order_successful,
                        "ar" : i18n.getCatalog('ar').order_successful
                    },
                    "message" : {
                        "en": i18n.getCatalog('en').order_success_desc,
                        "ar": i18n.getCatalog('ar').order_success_desc
                    }
                }

                this.sendPushNotification(orderId, cofe_reference_id, MARKETPLACE_ORDER_DETAIL, notification, data).then((r) => {
                    console.log('Notified To Customer');
                });

                let currentDate = moment(this.now()).format('YYYY-MM-DD');

                let slackPaymentMathod = (payment_method === 'TABBY') ? 'TABBY' : 'Wallet';

                const slackData = { 'OrderId': orderId, 'Reference': reference, 'PaymentMethod': slackPaymentMathod,
                    'TotalAmount': parseFloat(total_paid_tax_incl), 'Marketplace': countryIso, 'orderDate': currentDate }

                this.sendOrderSlackNotification(slackData).then((r) => { console.log('Notified To Operations'); });

                if (supplierSMS) {

                    const smsData = { 'Reference': reference, orderId, 'Marketplace': countryIso, 'orderItems': orderProducts }

                    this.sendOrderSmsNotification(smsData).then((r) => {
                        console.log('Notified To Suppliers');
                    });
                }

                this.sendOrderEmails(emailsPayload).then((r) => { console.log('Order Confirmation Email sent.'); });
            }

        } else {

            if (payment_method === 'TABBY') {
                response = { id: orderId, paymentMethod: payment_method }
                return { data: response }
            }

            // invalidate Cart
            await this.invalidateCart(id_cart);
            // Update Products Current Stock
            await this.updateProductsStock(cart.cartItems);

            const notification = {
                "heading": {
                    "en": i18n.getCatalog('en').order_successful,
                    "ar": i18n.getCatalog('ar').order_successful
                },
                "message": {
                    "en": i18n.getCatalog('en').order_success_desc,
                    "ar": i18n.getCatalog('ar').order_success_desc
                }
            }

            this.sendPushNotification(orderId, cofe_reference_id, MARKETPLACE_ORDER_DETAIL, notification, data).then((r) => {
                console.log('Notified To Customer');
            });

            let currentDate = moment(this.now()).format('YYYY-MM-DD');

            const slackData = {
                'OrderId': orderId, 'Reference': reference, 'PaymentMethod': payment_method,
                'TotalAmount': parseFloat(total_paid_tax_incl), 'Marketplace': countryIso, 'orderDate': currentDate
            }

            this.sendOrderSlackNotification(slackData).then((r) => {
                console.log('Notified To Operations');
            });

            if (supplierSMS) {
                
                const smsData = { 'Reference': reference, orderId, 'Marketplace': countryIso, 'orderItems': orderProducts }

                this.sendOrderSmsNotification(smsData).then((r) => {
                    console.log('Notified To Suppliers');
                });
            }

            this.sendOrderEmails(emailsPayload).then((r) => { console.log('Order Confirmation Email sent.'); });
        }

        this.generateTaxInvoice(orderId).then((r) => { console.log('Tax Invoice Generated'); });

        return { data: response };
    }

    model.updateOrder = async function updateOrder(order, i8ln) {

        const { locale } = i8ln

        const newProducts = []

        // coupon handling to be added later
        const { id: orderId, notes, trackingNumber, trackingUrl, awbFilePath, deliveryPartner, coupon, deliveryAddress, mapLink, city } = order

        let { products } = order

        // remove duplicate products
        const duplicateFreeProducts = []
        const map = new Map()

        if (products?.length) {

            for (const item of products) {
                item.id_attribute = item.id_attribute || default_uuid

                const key = `${item.id}-${item.id_attribute}`
                if (!map.has(key)){

                    map.set(key, true)
                    duplicateFreeProducts.push(item)
                }
            }

            if (products?.length && duplicateFreeProducts?.length !== products.length)
                throw new Error(`order_update_duplicate_products_exist`)

            products = duplicateFreeProducts
        }

        const itExists = await this.doesExist((builder) => {
            builder.where((innerBuilder)=>{
                innerBuilder.where({ id: orderId })
            })
        })

        if (!itExists)
            throw new Error(`order_not_exist`)

        const productsToDelete = []

        if (products?.length) {
            for (const product of products) {

                if (product.deleted) {
                    productsToDelete.push({ id: product.id, id_product_attribute: product.id_attribute })
                }

                let item = {};

                let updatedItem = await link.from('order_details')
                    .where({ id_order: orderId, id_product: product.id, id_product_attribute: product.id_attribute }).first()

                if (!updatedItem)  {
                    item = await this.productDetail({ idProduct: product.id, idProductAttribute: product.id_attribute || default_uuid }, {}, true)
                    item.state = 'new';
                } else {
                    item = updatedItem;
                    item.state = 'old';
                }

                if (item) {
                    // set updated quantity and status to product
                    item.updates = {
                        status: product.status,
                        quantity: product.quantity,
                        id_product_attribute: product.id_attribute || default_uuid
                    }

                    newProducts.push(item)
                }
            }
        }

        const currentOrder = await link.from('orders').where('id', orderId).select('*').first()

        const { vat_rate } = await link.from('order_details').where('id_order', orderId).first('vat_rate')

        // get previous var rate from orders then delete previous products
        if (vat_rate !== null && newProducts.length) {
            await link('order_product_status').del().where({ id_order: orderId })
        }

        let total_products_tax_incl = Number(currentOrder.total_products_tax_incl)
        let total_products_tax_excl = Number(currentOrder.total_products_tax_excl)

        // shipping amount
        const total_shipping_tax_incl = Number(currentOrder.total_shipping_tax_incl)
        const total_shipping_tax_excl = Number(currentOrder.total_shipping_tax_excl)

        // discounts
        // will be utilized later when coupon would apply
        let total_discounts_tax_incl = Number(currentOrder.total_discounts_tax_incl)
        let total_discounts_tax_excl = Number(currentOrder.total_discounts_tax_excl)

        // COD Fees
        let cod_fee = Number(currentOrder.cod_fee)
       
        if (newProducts.length) {

            const orderItems = [];
            const orderProductStatus = [];

            // initialize prices to zero
            total_products_tax_incl = 0
            total_products_tax_excl = 0

            for (let item of newProducts) {

                let reduction_percentage = null;
                let reduction_amount_tax_incl = 0;
                let reduction_amount_tax_excl = 0;

                if (item.state === 'old') {

                    const total_price_tax_incl = (item.unit_price_tax_incl * item.updates.quantity).toFixed(2)
                    const total_price_tax_excl = (item.unit_price_tax_excl * item.updates.quantity).toFixed(2)

                    const tax_amount = (total_price_tax_incl - total_price_tax_excl).toFixed(2)

                    total_products_tax_incl += Number(total_price_tax_incl)
                    total_products_tax_excl += Number(total_price_tax_excl)

                    await link('order_details')
                        .update({
                            total_price_tax_excl,
                            total_price_tax_incl,
                            tax_amount,
                            product_quantity: item.updates.quantity
                        })
                        .where({ id_order: orderId, id_product: item.id_product, id_product_attribute: item.id_product_attribute })

                } else {

                    if (item.reductionPrice) {
                        if (item.reductionPrice.reductionType == 'percentage') {
                            reduction_percentage = parseFloat(item.reductionPrice.reductionValue);
                        }

                        reduction_amount_tax_incl = (item.reductionPrice) ? parseFloat(item.reductionPrice.reductionAmount) : 0
                        reduction_amount_tax_excl = (item.reductionPrice) ? parseFloat(item.reductionPrice.reductionAmountTaxExcl) : 0
                    }

                    item.priceTaxExcl = item.priceTaxExcl - reduction_amount_tax_excl

                    const product_image = item.images?.length ? item.images[0].image : null

                    let priceWithVat = await this.productVatCalculation(item.priceTaxExcl, vat_rate)

                   // priceWithVat = priceWithVat - reduction_amount_tax_incl

                    const total_price_tax_incl = (priceWithVat * item.updates.quantity).toFixed(2)
                    const total_price_tax_excl = (item.priceTaxExcl * item.updates.quantity).toFixed(2)

                    const tax_amount = (total_price_tax_incl - total_price_tax_excl).toFixed(2)

                    total_products_tax_incl += Number(total_price_tax_incl)
                    total_products_tax_excl += Number(total_price_tax_excl)

                    orderItems.push({
                        id: guid.v4(),
                        id_order: orderId,
                        id_supplier: item.idSupplier,
                        id_product: item.id,
                        id_product_attribute: item.updates.id_product_attribute,
                        product_name: item.name,
                        product_name_ar: item.product_metadata[1].name,
                        product_reference: item.reference,
                        product_quantity: item.updates.quantity,
                        available_quantity: item.quantity,
                        unit_price_tax_excl: item.priceTaxExcl,
                        unit_price_tax_incl: priceWithVat,
                        total_price_tax_excl,
                        total_price_tax_incl,
                        reduction_amount_tax_excl,
                        reduction_amount_tax_incl,
                        reduction_percentage,
                        vat_rate,
                        tax_amount,
                        product_image,
                    })
                }

                orderProductStatus.push({
                    id: guid.v4(),
                    id_order: orderId,
                    id_product: (item.state === 'new') ? item.id : item.id_product,
                    id_product_attribute: item.updates.id_product_attribute,
                    status: item.updates.status,
                })
            }

            if (orderItems.length) {
                await link('order_details').insert(orderItems)

                let orderSupplierStatus = [];

                const suppliers = uniqBy(orderItems, 'id_supplier')

                let newState = await link.from('supplier_statuses').where('status', 'New').first('id')
        
                const promises = suppliers.map(async (supplier) => {

                    let checkExist = await link.from('order_supplier_status')
                        .where({ 'id_supplier': supplier.id_supplier, 'id_order': orderId }).first('id');

                    if (!checkExist) {
                        orderSupplierStatus.push({
                            id: guid.v4(),
                            'id_supplier' : supplier.id_supplier,
                            'id_order': orderId,
                            'id_status' : newState.id
                        })
                    }
                })
        
                await Promise.all(promises);

                if (orderSupplierStatus.length > 0) {
                    await link('order_supplier_status').insert(orderSupplierStatus)
                }
                
            }
                
            await link('order_product_status').insert(orderProductStatus)
        }

        if (productsToDelete.length) {

            for (const product of productsToDelete) {
                await link('order_details').del().where({ id_order: orderId, id_product: product.id, id_product_attribute: product.id_product_attribute })
            }
        }

        let couponsChanged = false

        if (coupon?.length) {
            const couponsToRemove = coupon.filter((c) => c.action === 'remove')

            for (const coupon of couponsToRemove) {

                const [ removedCoupon ] = await link('order_cart_rule')
                    .del()
                    .where({ id_order: orderId, id_cart_rule: coupon.id_cart_rule })
                    .returning('*')

                if (!removedCoupon) {
                    throw new Error(`Coupon to be removed was not applied to this order.`)
                }

                if (removedCoupon.reduction_type && removedCoupon.reduction_type === 'amount') {
                    total_discounts_tax_incl -= removedCoupon.cart_rule_amount_tax_excl
                } else {
                    total_discounts_tax_incl -= removedCoupon.cart_rule_amount_tax_incl
                }
                
                total_discounts_tax_excl -= removedCoupon.cart_rule_amount_tax_excl

                couponsChanged = true
            }

            const couponsToApply = coupon.filter((c) => c.action === 'apply')

            if (couponsToApply.length) {

                let appliedCoupons = await link.from('order_cart_rule').where({ id_order: orderId }).select('id_cart_rule')
                appliedCoupons = appliedCoupons.map((rule) => rule.id_cart_rule)

                let insertedRules = [];

                for (const coupon of couponsToApply) {

                    if (appliedCoupons.includes(coupon.id_cart_rule)) {
                        continue
                    }

                    const cartRule = await this.getCartRule(coupon.id_cart_rule, locale);

                    if (!cartRule)
                        throw new Error(`Cart rule is disabled, please proceed after removing the coupon`)

                    const dateFrom = moment(cartRule.date_from).format('YYYY-MM-DD HH:mm:ss Z')
                    const dateTo =   moment(cartRule.date_to).format('YYYY-MM-DD HH:mm:ss Z')

                    if (!moment(this.now()).isBetween(dateFrom, dateTo))
                        throw new Error(`${cartRule.name} validity has been expired, please proceed after removing the coupon`)

                    let reductionAmountTaxIncl = 0;
                    let reductionAmountTaxExcl = 0;

                    if (cartRule.reduction_type === 'percentage') {
                        reductionAmountTaxIncl = cartRule.reduction * total_products_tax_incl
                        reductionAmountTaxExcl = cartRule.reduction * total_products_tax_excl
                    } else {
                        const taxAmount = (vat_rate / 100) * cartRule.reduction;
                        reductionAmountTaxIncl = Number(cartRule.reduction) + taxAmount;
                        reductionAmountTaxExcl = cartRule.reduction;
                    }

                    insertedRules.push({
                        id: guid.v4(),
                        id_order: orderId,
                        id_cart_rule: cartRule.id,
                        code: cartRule.code,
                        reduction_type: cartRule.reduction_type,
                        cart_rule_amount_tax_excl: parseFloat(reductionAmountTaxExcl),
                        cart_rule_amount_tax_incl: parseFloat(reductionAmountTaxIncl)
                    })

                    if (cartRule.reduction_type && cartRule.reduction_type === 'amount') {
                        total_discounts_tax_incl += reductionAmountTaxExcl
                    } else {
                        total_discounts_tax_incl += reductionAmountTaxIncl
                    }
                    
                    total_discounts_tax_excl +=  reductionAmountTaxExcl
                }

                if (insertedRules.length){
                    await link('order_cart_rule').insert(insertedRules)
                    couponsChanged = true
                }
            }
        }

        const total_paid_tax_incl = total_products_tax_incl + total_shipping_tax_incl - total_discounts_tax_incl + cod_fee
        const total_paid_tax_excl = total_products_tax_excl + total_shipping_tax_excl - total_discounts_tax_excl + cod_fee

        const [ _order ] =  await link('orders')
                .update({
                    total_products_tax_incl,
                    total_products_tax_excl,
                    total_paid_tax_incl,
                    total_paid_tax_excl,
                    total_discounts_tax_incl,
                    total_discounts_tax_excl,
                    notes: notes || currentOrder.notes,
                    delivery_address: deliveryAddress || currentOrder.delivery_address,
                    city: city || currentOrder.city,
                    map_link: mapLink || currentOrder.map_link,
                })
                .where({ id: orderId })
                .returning('*')

        if (trackingNumber) {
            await link('order_carrier')
                .update({
                    waybill_number: trackingNumber,
                    id_carrier_partner: deliveryPartner,
                    tracking_url: trackingUrl,
                    awb_filepath: awbFilePath
                })
                .where({ id_order: orderId })

            await link('order_product_status')
                .update({
                    waybill_number: trackingNumber,
                })
                .where({ id_order: orderId })
        }

        if (newProducts?.length || couponsChanged)
            this.generateTaxInvoice(orderId).then((r) => { console.log('Tax Invoice Updated'); });

        // notes to be updated
        return { data: _order }
    }

    model.createOrder = async function createOrder(cart, customer, currentState, address, countryIso, notes, id_lang, codFee) {

        const { id: id_customer, phone_number, cofe_reference_id } = customer.data;

        const { id, idAddressDelivery, idCarrier, totalAmount, totalAmountTaxExcl, shippingAmountTaxExcl,
            shippingAmount, reductionAmount, reductionAmountTaxExcl, finalAmountTaxExcl, finalAmount, eta } = cart;

        if (!idCarrier)
            throw Error(`please select shipping method to place an order.`)

        const orderReference = (length= 8) => Math.random().toString(20).substr(2, length)

        const [insertId] = await link('orders').insert({
            id: guid.v4(),
            reference: orderReference().toUpperCase(),
            id_cart: id,
            id_customer,
            id_address_delivery: idAddressDelivery,
            id_address_invoice: idAddressDelivery,
            current_state: currentState.id, // payment in process,
            payment_status: 'Payment Pending',
            id_carrier: idCarrier,
            total_products_tax_excl: totalAmountTaxExcl,
            total_products_tax_incl: totalAmount,
            total_shipping_tax_excl: shippingAmountTaxExcl,
            total_shipping_tax_incl: shippingAmount,
            cod_fee: codFee,
            total_discounts_tax_excl: reductionAmountTaxExcl,
            total_discounts_tax_incl: reductionAmount,
            total_paid_tax_excl: finalAmountTaxExcl+codFee,
            total_paid_tax_incl: finalAmount+codFee,
            eta: (eta) ? eta.startDate : null,
            eta_last_date: (eta) ? eta.endDate : null,
            eta_days: (eta) ? eta.days : null,
            delivery_address: `${address.address}`,
            city: `${address.city}`,
            map_link: `https://www.google.com/maps/search/?api=1&query=${address.latitude},${address.longitude}`,
            marketplace: countryIso,
            notes: (notes) ? notes : null,
            cofe_customer_id: cofe_reference_id,
            cofe_customer_phone: phone_number,
            id_lang: id_lang ? id_lang: null,
        }, '*');

        return insertId;
    }

    model.createOrderProducts = async function createOrderProducts(id, cart, vatRate) {

        const { cartItems } = cart;

        let orderItems = [];
        let orderProductStatus = [];

        let orderSupplierStatus = [];

        let openState = await link.from('product_statuses').where('status', 'Action Required').first('id')

        for (let item of cartItems) {

            let reduction_percentage = null;

            if (item.product.reductionPrice) {
                if (item.product.reductionPrice.reductionType == 'percentage')
                    reduction_percentage = parseFloat(item.product.reductionPrice.reductionValue);
            }

            var imageName = item.product.productImage.split('/').pop();

            orderItems.push({
                id: guid.v4(),
                id_order: id,
                id_supplier: item.product.idSupplier,
                id_product: item.idProduct,
                id_product_attribute: item.idProductAttribute,
                product_name: item.product.name,
                product_name_ar: item.product.name_ar,
                product_reference: item.product.reference,
                product_quantity: item.quantity,
                available_quantity: item.product.quantity,
                unit_price_tax_excl: item.product.priceTaxExcl,
                unit_price_tax_incl: item.product.finalPrice,
                total_price_tax_excl: item.product.priceTaxExcl * item.quantity,
                total_price_tax_incl: item.product.finalPrice * item.quantity,
                reduction_amount_tax_excl: (item.product.reductionPrice) ? parseFloat(item.product.reductionPrice.reductionAmountTaxExcl) : null,
                reduction_amount_tax_incl: (item.product.reductionPrice) ? parseFloat(item.product.reductionPrice.reductionAmount) : null,
                reduction_percentage,
                vat_rate: vatRate,
                tax_amount: (item.product.finalPrice * item.quantity) - (item.product.priceTaxExcl * item.quantity),
                product_image: imageName,
                attributes: item.product.attributes ? item.product.attributes : null
            })

            orderProductStatus.push({
                id: guid.v4(),
                id_order: id,
                id_product: item.idProduct,
                id_product_attribute: item.idProductAttribute,
                status: openState.id
            })
        }

        const orderedProducts = await link('order_details').insert(orderItems, '*')

        const suppliers = uniqBy(orderedProducts, 'id_supplier')

        let newState = await link.from('supplier_statuses').where('status', 'New').first('id')

        suppliers.map((supplier) => {
            orderSupplierStatus.push({
                id: guid.v4(),
                'id_supplier' : supplier.id_supplier,
                'id_order': id,
                'id_status' : newState.id
            })
        })

        await link('order_supplier_status').insert(orderSupplierStatus)

        await link('order_product_status').insert(orderProductStatus)

        return orderedProducts;
    }

    model.getCart = async function getCart(id_cart, countryIso, locale, city) {

        const cart = await httpRequest.send({
            path: `${cartModuleUrl}${API_URLS.GET_CART}?id=${id_cart}`,
            method: 'GET',
            headers: { 'country-iso' : countryIso, locale, city },
            json: true
        });

        let result = cart.data;

        return result;
    }

    model.getCartRule = async function getCartRule(id, locale) {

        const cartRule = await httpRequest.send({
            path: `${discountModuleUrl}${API_URLS.GET_CART_RULE}/${id}`,
            method: 'GET',
            headers: { locale },
            json: true
        });

        let result = cartRule.data;

        return result;
    }

    model.autheticateCustomer = async function autheticateCustomer(cofeCustomerToken) {

        const authenticated = await httpRequest.send({
            path: `${coreModuleUrl}${API_URLS.AUTHENTICATE}`,
            method: 'POST',
            headers: { 'cofe-customer-token': cofeCustomerToken },
            json: true
        });

        return authenticated;
    }

    model.customerWallet = async function customerWallet(cofeCustomerToken, countryIso) {

        const customerWallet = await httpRequest.send({
            path: `${coreModuleUrl}${API_URLS.CUSTOMER_WALLET}`,
            method: 'GET',
            headers: { 'cofe-customer-token': cofeCustomerToken, 'country-iso': countryIso },
            json: true
        });

        return customerWallet;
    }

    model.getCountries = async function getCountries(country_iso = null) {

        let requestData = { filters: { active: true } };

        if (country_iso) {
            requestData = { filters: { active: true, iso_code: country_iso } };
        }

        const countries = await httpRequest.send({
            path: `${coreModuleUrl}${API_URLS.COUNTRIES}`,
            method: 'POST',
            headers: { },
            params: requestData,
            json: true
        });

        let result = countries.data

        return result;
    }

    model.getAddress = async function getAddress(id) {

        const address = await httpRequest.send({
            path: `${coreModuleUrl}${API_URLS.ADDRESS}/${id}`,
            method: 'GET',
            headers: { },
            json: true
        });

        if (address.address) {
            address.address.address = `${address.address.address}, ${address.address.city}`
        }
        
        let result = address.address

        return result;
    }

    model.getBulkAddresses = async function getBulkAddresses(id_addresses) {

        let requestData = { id_addresses };

        const addresses = await httpRequest.send({
            path: `${coreModuleUrl}${API_URLS.BULK_ADDRESS}`,
            method: 'POST',
            headers: { },
            params: requestData,
            json: true
        });

        let result = addresses?.data

        return result;
    }

    model.invalidateCart = async function invalidateCart(id_cart) {

        let requestData = { cart: { id_cart, is_ordered: true } };

        const cart = await httpRequest.send({
            path: `${cartModuleUrl}${API_URLS.UPDATE_CART}`,
            method: 'POST',
            headers: { },
            params: requestData,
            json: true
        });

        let result = cart.data;

        return result;
    }

    model.updateProductsStock = async function updateProductsStock(products) {

        let orderItems = [];

        for (let item of products) {
            orderItems.push({
                id_product: item.idProduct,
                id_product_attribute: item.idProductAttribute,
                product_quantity: item.quantity
            })
        }

        let requestData = { products: orderItems };

        const response = await httpRequest.send({
            path: `${productModuleUrl}${API_URLS.UPDATE_PRODUCT_STOCK}`,
            method: 'POST',
            headers: { },
            params: requestData,
            json: true
        });

        let result = response.data;

        return result;
    }

    model.customerOrders = async function customerOrders(i8ln, pagination) {

        const response = { data : { completedOrders: [], currentOrders: [] } }

        let { perPage, currentPage } = pagination

        const { cofeCustomerToken, countryIso } = i8ln;

        const customer = await this.autheticateCustomer(cofeCustomerToken);

        if (!customer.data)
            return customer;

        const { id } = customer.data;

        let id_customer = id;

        /** ===== Completed Orders ==== */

        let completedOrders = this.customerOrdersByStates(id_customer, countryIso, true)

        completedOrders = completedOrders.paginate({ perPage, currentPage, isLengthAware : true });

        let completed = await completedOrders;

        completed.data = knexnest.nest(completed.data);

        if (completed.data?.length) {

            for (let order of completed.data) {

                let orderProducts = await link
                    .select(
                        'od.id_product as idProduct',
                        'od.id_product_attribute as idProductAttribute',
                        'od.id_supplier as idSupplier',
                        'od.product_quantity as quantity',
                        'od.product_name as productName',
                        'od.product_image as productImage'
                    )
                    .from('order_details as od')
                    .where('od.id_order', order.id)

                orderProducts.map((products) => {
                    if (products.productImage)
                        products.productImage = `${cloudfront_url}${product_bucket}${products.productImage}`;
                })

                order.multiShipment = false;  
                var isDifferentSupplier = false;
                var firstSupplierId = null;      

                let products = groupBy(orderProducts, 'idSupplier');

                for (const [key, value] of Object.entries(products)) {

                    /** Supplier Order Status To Check Multi Shipment */

                    var currentSupplierId = key;

                    if (firstSupplierId === null) {
                        firstSupplierId = currentSupplierId;
                    } else if (firstSupplierId !== currentSupplierId) {
                        isDifferentSupplier = true;
                    }

                    let supplierOrderStatus = await link.from('order_supplier_status as oss')
                        .innerJoin('supplier_statuses as ss', 'oss.id_status', 'ss.id')
                        .where('oss.id_supplier', key)
                        .where('oss.id_order', order.id)
                        .first('oss.id_status', 'ss.status')

                    if (supplierOrderStatus && ['Shipped To Customer', 'Delivered'].includes(supplierOrderStatus.status)) {
                        if(!order.multiShipment)
                            order.multiShipment = true;  
                    }
                }
                
                if (order.multiShipment && isDifferentSupplier === false) {

                    order.multiShipment = false; 

                    let supplierOrderShipment = await link.from('order_supplier_shipments as oss')
                        .where({ 'oss.id_supplier': firstSupplierId, 'oss.id_order': order.id })
                        .first('oss.tracking_url')

                    if (supplierOrderShipment) {
                        order.trackingUrl = supplierOrderShipment.tracking_url;
                    }

                }

                order.orderProducts = orderProducts
            }
        }

        response.data.completedOrders = completed;

        /** Current Orders  */

        let currentOrders = this.customerOrdersByStates(id_customer, countryIso, false)

        let current = await currentOrders;

        current = knexnest.nest(current);

        if (current?.length) {

            for (let order of current) {

                let orderProducts = await link
                    .select(
                        'od.id_product as idProduct',
                        'od.id_product_attribute as idProductAttribute',
                        'od.id_supplier as idSupplier',
                        'od.product_quantity as quantity',
                        'od.product_name as productName',
                        'od.product_image as productImage'
                    )
                    .from('order_details as od')
                    .where('od.id_order', order.id)

                orderProducts.map((products) => {
                    if (products.productImage)
                        products.productImage = `${cloudfront_url}${product_bucket}${products.productImage}`;
                })

                order.multiShipment = false;
                var isDifferentSupplier = false;
                var firstSupplierId = null;          

                let products = groupBy(orderProducts, 'idSupplier');

                for (const [key, value] of Object.entries(products)) {

                    /** Supplier Order Status To Check Multi Shipment */

                    var currentSupplierId = key;

                    if (firstSupplierId === null) {
                        firstSupplierId = currentSupplierId;
                    } else if (firstSupplierId !== currentSupplierId) {
                        isDifferentSupplier = true;
                    }

                    let supplierOrderStatus = await link.from('order_supplier_status as oss')
                        .innerJoin('supplier_statuses as ss', 'oss.id_status', 'ss.id')
                        .where('oss.id_supplier', key)
                        .where('oss.id_order', order.id)
                        .first('oss.id_status', 'ss.status')

                    if (supplierOrderStatus && ['Shipped To Customer', 'Delivered'].includes(supplierOrderStatus.status)) {
                        if(!order.multiShipment)
                            order.multiShipment = true;   
                    }
                }  

                if (order.multiShipment && isDifferentSupplier === false) {

                    order.multiShipment = false; 

                    let supplierOrderShipment = await link.from('order_supplier_shipments as oss')
                        .where({ 'oss.id_supplier': firstSupplierId, 'oss.id_order': order.id })
                        .first('oss.tracking_url')

                    if (supplierOrderShipment) {
                        order.trackingUrl = supplierOrderShipment.tracking_url;
                    }

                }

                order.orderProducts = orderProducts
            }
        }

        response.data.currentOrders = current;

        return response;
    }

    model.customerOrderDetail = async function customerOrderDetail(params, i8ln) {

        const { id } = params;

        const { cofeCustomerToken, countryIso: countryIso } = i8ln;

        const customer = await this.autheticateCustomer(cofeCustomerToken);

        if (!customer.data)
            return customer;

        const { cofe_reference_id } = customer.data;

        const response = { data: null };

        let _link = link
            .select(
                'o.id as _id',
                'o.reference as _reference',
                'o.eta as _etaDate',
                'o.eta_last_date as _etaLastDate',
                'o.id_address_delivery as _idAddressDelivery',
                'o.delivery_address as _deliveryAddress',
                'o.total_products_tax_incl as _subTotal',
                'o.total_shipping_tax_incl as _deliveryFee',
                'o.cod_fee as _codFee',
                'o.total_discounts_tax_incl as _reductionAmount',
                'ocr.code as _discountCode',
                'o.total_paid_tax_incl as _totalAmount',
                'o.notes as _notes',
                'o.marketplace as _marketplace',
                'o.cofe_customer_id as _cofeCustomerId',
                'op.payment_method as _paymentType',
                'op.card_number as _cardNumber',
                'op.card_brand as _cardBrand',
                'op.card_exp as _cardExp',
                'op.currency as _currency',
                'op.credit_used as _creditUsed',
                'ot.url as _taxInvoice',
                'oc.tracking_url as _trackingUrl',
                'os.name as _orderStatus'
            )
            .from('orders as o')
            .leftJoin('order_tax_invoice as ot', 'o.id', 'ot.id_order')
            .leftJoin('order_cart_rule as ocr', 'o.id', 'ocr.id_order')
            .leftOuterJoin('order_carrier as oc', 'o.id', 'oc.id_order')
            .innerJoin('order_payment as op', 'o.id', 'op.id_order')
            .innerJoin('order_states as os', 'o.current_state', 'os.id')
            .where('o.id', id)

        let result = await _link;

        result = knexnest.nest(result);

        if (result?.length) {

            let order = result[0];

            if (order.cofeCustomerId !== cofe_reference_id) {
                return response;
            }

            i8ln.countryIso = order.marketplace;

            const address = await this.getAddress(order.idAddressDelivery);

            let _link = await link
                .select(
                    'od.id_product as idProduct',
                    'od.id_product_attribute as idProductAttribute',
                    'od.unit_price_tax_incl as finalPrice',
                    'od.product_quantity as quantity',
                    'od.vat_rate as vatRate',
                    'od.id_supplier as idSupplier'
                )
                .from('order_details as od')
                .where('od.id_order', id)

            order.orderedItems = _link

            order.multiShipment = false; 
            var isDifferentSupplier = false;
            var firstSupplierId = null;          

            let products = groupBy(order.orderedItems, 'idSupplier');

            for (const [key, value] of Object.entries(products)) {

                /** Supplier Order Status To Check Multi Shipment */

                var currentSupplierId = key;

                if (firstSupplierId === null) {
                    firstSupplierId = currentSupplierId;
                } else if (firstSupplierId !== currentSupplierId) {
                    isDifferentSupplier = true;
                }

                let supplierOrderStatus = await link.from('order_supplier_status as oss')
                    .innerJoin('supplier_statuses as ss', 'oss.id_status', 'ss.id')
                    .where('oss.id_supplier', key)
                    .where('oss.id_order', id)
                    .first('oss.id_status', 'ss.status')

                if (supplierOrderStatus && ['Shipped To Customer', 'Delivered'].includes(supplierOrderStatus.status)) {
                    if(!order.multiShipment)
                        order.multiShipment = true;
                }
            }  
            
            if (order.multiShipment && isDifferentSupplier === false) {

                order.multiShipment = false; 

                let supplierOrderShipment = await link.from('order_supplier_shipments as oss')
                    .where({ 'oss.id_supplier': firstSupplierId, 'oss.id_order': id })
                    .first('oss.tracking_url')

                if (supplierOrderShipment) {
                    order.trackingUrl = supplierOrderShipment.tracking_url;
                }
            }

            for (let product of order.orderedItems) {

                const { idProduct, idProductAttribute } = product

                let item = { idProduct, idProductAttribute };

                const detail = await this.productDetail(item, i8ln)

                product.reference = detail.reference
                product.name = detail.name
                product.productImage = detail.productImage
                product.attributes = detail.attributes

                product.finalPrice = (product.finalPrice) ? parseFloat(product.finalPrice) : 0

                delete product.idProduct
                delete product.idProductAttribute
            }

            order.address = (address) ? address.address : 'N/A';

            if(order.deliveryAddress) {
                order.address = order.deliveryAddress;
            }

            order.taxInvoice = `${cloudfront_url}taxInvoices/${order.taxInvoice}`

            order.vat = order.orderedItems[0].vatRate;

            order.deliveryFee = (order.deliveryFee) ? parseFloat(order.deliveryFee) : null
            order.totalAmount = (order.totalAmount) ? parseFloat(order.totalAmount) : null
            order.reductionAmount = (order.reductionAmount) ? parseFloat(order.reductionAmount) : null
            order.subTotal = (order.subTotal) ? parseFloat(order.subTotal) : null
            order.creditUsed = (order.creditUsed) ? parseFloat(order.creditUsed) : 0
            order.codFee = (order.codFee) ? parseFloat(order.codFee) : 0

            order.amountDue = (parseFloat(order.totalAmount - order.creditUsed).toFixed(2));

            order.cardIcons = [paymentIcons[order.paymentType]];

            if (order.creditUsed && order.paymentType !== 'CREDIT')
                order.cardIcons.push(paymentIcons.CREDIT)

            order.card = null;

            if (order.cardNumber) {
                let brand = (order.cardBrand) ? order.cardBrand : '****';
                order.card = `${brand} **** ${order.cardNumber}`;
            }

            delete order.cardNumber
            delete order.cardExp
            delete order.cardBrand
            delete order.idAddressDelivery

            response.data = order;
        }

        return response;
    }

    model.orderShipments = async function orderShipments(params, i8ln) {

        const { id } = params;

        const { cofeCustomerToken, countryIso: countryIso, locale } = i8ln;

        const customer = await this.autheticateCustomer(cofeCustomerToken);

        if (!customer.data)
            return customer;

        const { cofe_reference_id } = customer.data;

        const response = { data: null };

        let order = await link
            .select('o.id', 'o.reference', 'os.name as orderStatus', 'o.cofe_customer_id as cofeCustomerId')
            .from('orders as o')
            .innerJoin('order_states as os', 'o.current_state', 'os.id')
            .where('o.id', id).first()

        if (order) {

            if (order.cofeCustomerId !== cofe_reference_id) {
                return response;
            }

            // order details ...
            let products = await link
                .select(
                    'od.id_product as idProduct',
                    'od.id_supplier as idSupplier',
                    'od.product_name as productName',
                    'od.product_image as productImage',
                    'od.product_reference as reference',
                    'ps.status as status'
                )
                .from('order_details as od')
                .leftOuterJoin('order_product_status as ops', function() {
                    this
                        .on('od.id_product', '=', 'ops.id_product')
                        .andOn('od.id_product_attribute', '=', 'ops.id_product_attribute')
                        .andOn('ops.id_order', '=', 'od.id_order')
                })
                .leftOuterJoin('product_statuses as ps','ps.id','ops.status')
                .where('od.id_order', id).where('ps.status', '!=', 'Not Available')

                if (!products.length) {
                    throw new Error(`Order not found.`)
                }
                
            let supplierProducts = groupBy(products,'idSupplier');

            const productDetails = []
           
            for (const [key, value] of Object.entries(supplierProducts)) {

                /** Supplier Order Status For Order Detail of Shipments */

                let supplierOrderStatus = await link.from('order_supplier_status as oss')
                    .innerJoin('supplier_statuses as ss', 'oss.id_status', 'ss.id')
                    .where('oss.id_supplier', key)
                    .where('oss.id_order', id)
                    .first('oss.id_status', 'ss.status', 'oss.updated_at')

                productDetails.push({
                    supplierId : key,
                    status : (supplierOrderStatus) ? supplierOrderStatus.status : 'N/A',
                    products: value,
                    totalItems: value.length,
                    shipmentDate: supplierOrderStatus.updated_at,
                    trackingUrl: null
                })
            }

            for (let index = 0; index < productDetails.length; index++) {
                    
                const orderItem = productDetails[index];

                let supplierOrderShipment = await link.from('order_supplier_shipments as oss')
                    .where({ 'oss.id_supplier': orderItem.supplierId, 'oss.id_order': id })
                    .first('oss.tracking_url', 'oss.tracking_number')

                if (supplierOrderShipment) {
                    orderItem.trackingUrl = supplierOrderShipment.tracking_url;
                }

                if (['New', 'Waiting for PickUp', 'Sent to Consolidated Center'].includes(orderItem.status)) {
                    orderItem.status = i18n.getCatalog('en').not_dispatched;
                }

                if (['Shipped To Customer'].includes(orderItem.status)) {
                    orderItem.status = i18n.getCatalog('en').out_for_delivery;
                }

                if (['Delivered'].includes(orderItem.status)) {
                    orderItem.status = i18n.getCatalog('en').delivered;
                }

                if (['Cancelled'].includes(orderItem.status)) {
                    orderItem.status = i18n.getCatalog('en').cancelled;
                }

                for (let innerIndex = 0; innerIndex < orderItem.products.length; innerIndex++) {
                    const item = orderItem.products[innerIndex];    
                    item.productImage = `${cloudfront_url}${product_bucket}${item.productImage}`;
                }
            }

            order.shipments = productDetails
            order.totalShipments = productDetails.length;
    
            delete order.cofeCustomerId

            response.data = order;
        }

        return response;
    }

    /** ====== Admin Dashboard APIs ========= **/

    model.getAllOrders = async function getAllOrders({ filters, pagination, i8ln }) {

        const { keyword, startDate, endDate, sort_by, id_supplier, countryIso, orderStatus, cofeCustomerId, supplier, customerName } = filters;

        const { perPage, currentPage, paginate } = pagination;

        const { id_lang } = i8ln;

        let _link = link
            .select(
                'o.id as _id',
                'o.reference as _reference',
                'o.id_customer as _customerId',
                'o.total_paid_tax_incl as _total',
                'o.total_shipping_tax_incl as _deliveryFee',
                'o.id_carrier as _carrierId',
                'o.id_address_delivery as _shippingAddressId',
                'o.id_address_invoice as _billingAddressId',
                'o.delivery_address as _deliveryAddress',
                'o.created_at as _orderDate',
                'o.payment_status as _paymentStatus',
                'os.color as _color',
                'op.payment_method as _paymentMethod',
            )
            .from('orders as o')
            .leftOuterJoin('order_states as os', 'o.current_state', 'os.id')
            .leftOuterJoin('order_payment as op', 'op.id_order', 'o.id')

        if (id_supplier) {
            _link = _link.innerJoin('order_details', 'order_details.id_order', 'o.id')

            _link = _link.select(link.raw('sum(order_details.total_price_tax_incl) as _total'),
                                                        'order_details.id_supplier as _idSupplier')

            _link = _link.whereIn('order_details.id_supplier', [id_supplier]).whereNotIn('current_state', failureStateIds)


            _link = _link.groupBy('o.id','os.color', 'op.payment_method', 'os.name', 'order_details.id_supplier')
        }

        if (supplier) {
            _link = _link.innerJoin('order_details', 'order_details.id_order', 'o.id').whereIn('order_details.id_supplier', [supplier])
        }

        // for language based order status selection
        if (id_lang === languages.en) {
            _link = _link.select('os.name as _state')
        }

        if (id_lang === languages.ar) {
            _link = _link.select('os.name_ar as _state')
        }

        if (keyword) {
            _link = _link.where(function(q) {
                q.where('o.reference', 'Ilike', '%' + keyword + '%')

                if (id_lang === languages.en) {
                    q.orWhere('os.name', 'Ilike', '%' + keyword + '%')
                }

                if (id_lang === languages.ar) {
                    q.orWhere('os.name_ar', 'Ilike', '%' + keyword + '%')
                }
            })
        }

        if (sort_by) {
            if (sort_by.id) {
                _link = _link.orderBy('o.id', sort_by.id)
            }

            if (sort_by.total) {
                _link = _link.orderBy('o.total_paid_tax_incl', sort_by.total )
            }

            if (sort_by.reference) {
                _link = _link.orderBy('o.reference', sort_by.reference)
            }

            if (sort_by.paymentStatus) {
                _link = _link.orderBy('o.payment_status', sort_by.paymentStatus)
            }

            if (sort_by.paymentMethod) {
                _link = _link.orderBy( 'op.payment_method',sort_by.paymentMethod)
            }

            if (sort_by.orderDate) {
                _link = _link.orderBy('o.created_at', sort_by.orderDate)
            }
        } else {
            // default sorting
            _link = _link.orderBy('o.created_at', 'desc')
        }

        if (startDate && !endDate) {
            const date = moment(startDate).startOf('day').utc()

            _link = _link.where(function (q) {
                        q.where("o.created_at", ">=", date);
                    })
        }

        if (!startDate && endDate) {
            const date = moment(endDate).endOf('day').utc()

            _link = _link.where(function (q) {
                        q.where("o.created_at", "<=", date);
                    })
        }

        if (startDate && endDate) {
            const dateFrom = moment(startDate).startOf('day').utc()
            const dateTo = moment(endDate).endOf('day').utc()

            _link = _link
                .where(function (q) {
                    q.where("o.created_at", ">=", dateFrom).where(
                        "o.created_at",
                        "<=",
                        dateTo
                    );
                })
        }

        if (countryIso) {
            _link = _link.where('o.marketplace', countryIso)
        }

        if (orderStatus) {
            _link = _link.where('o.current_state', orderStatus)
        }

        if (cofeCustomerId) {
            _link = _link.where('o.cofe_customer_id', cofeCustomerId)
        }

        if (customerName) {
            let customers = await this.getCustomerDetails([], customerName)

            if (customers?.length) {
                let ids = customers.map((item) => item.id);
                _link = _link.whereIn('o.id_customer', ids)      
            }
        }

        if (paginate)
            _link = _link.paginate({ perPage, currentPage, isLengthAware: true });

        let response = await _link;

        let result = {}

        if (paginate) {
            result.data = knexnest.nest(response.data);
            result.pagination = response.pagination;
        } else {
            result.data = knexnest.nest(response);
        }

        let customerIds = []

        let addressIds = []


        if (result.data?.length) {

            customerIds = result.data.map((order) => order.customerId)
            addressIds = result.data.map((order) => order.shippingAddressId)

            let supplierOrderStatus = null

            if (id_supplier) {
                const orderIds = result.data.map((order) => order.id)

                supplierOrderStatus = await link.from('order_supplier_status as oss')
                                                .innerJoin('supplier_statuses as ss', 'oss.id_status', 'ss.id')
                                                .where('oss.id_supplier', id_supplier)
                                                .whereIn('oss.id_order', orderIds)
                                                .select('oss.id_order', 'ss.status')

                supplierOrderStatus = groupBy(supplierOrderStatus,'id_order')
            }

            let shipmentInformation = await this.getDeliveryInformation()
            shipmentInformation = groupBy(shipmentInformation,'id')

            let addresses = await this.getBulkAddresses(addressIds)

            addresses = groupBy(addresses, 'id')

            if (customerIds.length) {
                let customers = await this.getCustomerDetails([...new Set(customerIds)])

                if (customers?.length) {
                    customers = groupBy(customers,'id')

                    for (let index = 0; index < result.data.length; index++) {
                        const order = result.data[index];
                        order.customerDetails = customers[order.customerId]?.length ?  customers[order.customerId][0] : null

                        let shippingInfo = addresses[order.shippingAddressId][0]

                        if (shipmentInformation) {

                            let formattedAddress = shippingInfo ? shippingInfo.address : null
                            let city = shippingInfo ? shippingInfo.city : null 

                            if (city !== null)
                                formattedAddress = `${formattedAddress}, ${city}`

                            if (order.deliveryAddress !== null)
                                formattedAddress = order.deliveryAddress;   

                            order.shipping = {
                                method: shipmentInformation[order.carrierId] ? shipmentInformation[order.carrierId][0]['name'] : null,
                                information:  formattedAddress,
                                city:  shippingInfo ? shippingInfo.city : null,
                            }
                        }

                        order.payment = {
                            status: order.paymentStatus,
                            method: order.paymentMethod,
                        }

                        order.orderStatus = {
                            color: order.color,
                            state: order.state,
                        }

                        if (id_supplier) {
                            order.orderStatus = {
                                state: supplierOrderStatus[order.id] && supplierOrderStatus[order.id].length ? supplierOrderStatus[order.id][0]['status'] : 'N/A'
                            }
                        }

                        delete order.shippingAddressId
                        delete order.billingAddressId
                        delete order.carrierId
                        delete order.customerId
                        delete order.paymentStatus
                        delete order.paymentMethod
                        delete order.state
                        delete order.color
                    }
                }
            }
        }

        return result;
    }

    model.getsupplierAndProductDetails = async function getsupplierAndProductDetails(productIds, supplierIds, countryIso) {

        const requestData = { id_products: productIds, id_suppliers: supplierIds };

        const customer = await httpRequest.send({
            path: `${productModuleUrl}${API_URLS.GET_SUPPLIER_AND_PRODUCT_DETAILS}`,
            method: 'POST',
            params: requestData,
            headers: { 'country-iso': countryIso },
            json: true
        });

        let result = customer?.data

        if (!result)
            throw Boom.notFound('Supplier and Products not found.');

        return result
    }

    model.getDeliveryInformation = async function getDeliveryInformation(carrierId = null) {

        let requestData = { filters: {} }

        if (carrierId){
            requestData = { filters: { id: carrierId } }
        }

        const carriers = await httpRequest.send({
            path: `${deliveryModuleUrl}${API_URLS.CARRIERS}`,
            method: 'POST',
            params: requestData,
            json: true
        });

        const result = carrierId ? carriers?.data?.length && carriers?.data[0] : carriers?.data

        return result;
    }

    model.getDeliveryPartner = async function getDeliveryPartner(partnerId = null, marketplace = null, keyword = null) {

        let requestData = { filters: {} }

        let headers = {}

        if (partnerId){
            requestData = { filters: { id: partnerId } }
        }

        if (keyword){
            requestData = { filters: { keyword: keyword } }
        }

        if (marketplace) {
            requestData.filters.marketplace = marketplace
            module = backofficeModuleUrl
            headers['per-page'] = 100 // An assumed maximum upper limit in a country
        }

        const carriers = await httpRequest.send({
            path: `${deliveryModuleUrl}${API_URLS.CARRIER_PARTNERS}`,
            method: 'POST',
            params: requestData,
            headers,
            json: true
        });

        const result = partnerId ? carriers?.data?.length && carriers?.data[0] : carriers?.data

        return result;
    }

    model.viewOrderDetails = async function viewOrderDetails({ params, query, i8ln }) {

        const { id } = params

        const { id_supplier } = query

        let suppliersTotal = 0

        const { id_lang } = i8ln

        const product = {}

        let _link = link
            .select(
                'o.id as _orderId',
                'o.created_at as _orderDate',
                'o.reference as _orderReference',
                'o.id_carrier as _carrierId',
                'o.id_address_delivery as _shippingAddressId',
                'o.id_address_invoice as _billingAddressId',
                'o.id_customer as _customerId',
                'o.delivery_address as _deliveryAddress',
                'o.city as _city',
                'o.map_link as _mapLink',
                'o.cofe_customer_id as _cofeCustomerId',
                'o.marketplace as _marketplace',
                'o.notes as _notes',
                'os.id as _currentSatus_id',
                'os.color as _currentSatus_color',
                'op.payment_method as _paymentInfo_paidWith',
                'op.credit_used as _pricing_creditUsed',
                'op.currency as _paymentInfo_currency',
                'op.created_at as _paymentInfo_transactionDate',
                'o.payment_status as _paymentInfo_paymentStatus',
                'o.total_products_tax_incl as _pricing_totalProductsTaxIncl',
                'o.total_products_tax_excl as _pricing_totalProductsTaxExcl',
                'o.total_discounts_tax_incl as _pricing_totalDiscountTaxIncl',
                'o.total_paid_tax_incl as _pricing_totalPaidTaxIncl',
                'o.total_paid_tax_excl as _pricing_totalPaidTaxExcl',
                'o.total_discounts_tax_excl as _pricing_totalDiscountTaxExcl',
                'o.total_shipping_tax_excl as _pricing_totalShippingTaxExcl',
                'o.total_shipping_tax_incl as _pricing_totalShippingTaxIncl',
                'o.cod_fee as _pricing_codFee',
                'ot.url as _taxInvoice',
                'oc.waybill_number as _trackingNumber',
                'oc.id_carrier_partner as _carrierPartner',
                'oc.tracking_url as _trackingUrl',
                'oc.awb_filepath as _awbFilePath',
                'ocr.id_cart_rule as _coupons__id',
                'ocr.code as _coupons__code',
            )
            .from('orders as o')
            .leftOuterJoin('order_states as os', 'o.current_state', 'os.id')
            .leftOuterJoin('order_payment as op', 'op.id_order', 'o.id')
            .leftOuterJoin('order_carrier as oc', 'oc.id_order', 'o.id')
            .leftOuterJoin('order_cart_rule as ocr', 'ocr.id_order', 'o.id')
            .leftJoin('order_tax_invoice as ot', 'o.id', 'ot.id_order')
            .where('o.id', id)

        // for language based order status selection
        if (id_lang === languages.en) {
            _link = _link.select('os.name as _currentSatus_state')
        }

        if (id_lang === languages.ar) {
            _link = _link.select('os.name_ar as _currentSatus_state')
        }

        let result = await _link;

        result = knexnest.nest(result);

        if (!result) {
            throw new Error(`Order not found.`)
        }

        if (result?.length){
            result = result.pop()

            result.pricing.creditUsed = (result.pricing.creditUsed) ? parseFloat(result.pricing.creditUsed) : 0

            result.pricing.vat = Number(result.pricing?.totalPaidTaxIncl - result.pricing?.totalPaidTaxExcl).toFixed(2)

            //result.orderDate = moment(result.orderDate, 'MMMM Do YYYY').format('MMMM Do YYYY')
            result.orderDate = moment(result.orderDate).utc();

            result.taxInvoice = `${cloudfront_url}taxInvoices/${result.taxInvoice}`

            // order details ...
            let products = link
                .select(
                    'od.id_supplier',
                    'od.id_product',
                    'od.id_product_attribute',
                    'od.product_name',
                    'od.product_reference',
                    'od.product_quantity',
                    'od.unit_price_tax_incl',
                    'od.unit_price_tax_excl',
                    'od.total_price_tax_excl',
                    'od.total_price_tax_incl',
                    'od.reduction_amount_tax_incl',
                    'od.reduction_amount_tax_excl',
                    'od.attributes',
                    'od.vat_rate',
                    'od.tax_amount',
                    'ops.status as id_status',
                    'ps.color',
                    'ps.status',
                )
                .from('order_details as od')
                .leftOuterJoin('order_product_status as ops', function() {
                    this
                        .on('od.id_product', '=', 'ops.id_product')
                        .andOn('od.id_product_attribute', '=', 'ops.id_product_attribute')
                        .andOn('ops.id_order', '=', 'od.id_order')
                })
                .leftOuterJoin('product_statuses as ps','ps.id','ops.status')
                .where('od.id_order', id)

                if (id_supplier) {
                    products = products.where('od.id_supplier', id_supplier)
                }

            products = await products

            if (!products.length) {
                throw new Error(`Order not found.`)
            }

            result.products = groupBy(products,'id_supplier');

            const productDetails = []
            let productsToGetDetails = []
            let suppliersToGetDetails = []

            for (const [key, value] of Object.entries(result.products)) {

                let pricing = { totalProductsTaxExcl: 0, totalProductsTaxIncl: 0, totalPaidTaxIncl : 0, vat: 0,
                    totalPaidTaxExcl: 0, totalShippingTaxExcl: 0, totalDiscountTaxExcl: 0, codAmountSalasa: 0 };

                value.map((val) => {

                    pricing.totalProductsTaxExcl = (parseFloat(pricing.totalProductsTaxExcl) + parseFloat(val.total_price_tax_excl))
                        .toFixed(2)

                    pricing.totalProductsTaxIncl = (parseFloat(pricing.totalProductsTaxIncl) + parseFloat(val.total_price_tax_incl))
                        .toFixed(2)

                    pricing.totalPaidTaxIncl = (parseFloat(pricing.totalPaidTaxIncl) + parseFloat(val.total_price_tax_incl))
                        .toFixed(2)
                    pricing.totalPaidTaxExcl = (parseFloat(pricing.totalPaidTaxExcl) + parseFloat(val.total_price_tax_excl))
                        .toFixed(2)

                    if(val.reduction_amount_tax_excl == null){
                        val.reduction_amount_tax_excl = 0.00;
                        val.reduction_amount_tax_incl = 0.00;
                    }

                });

                let supplierPercentage = (parseFloat(pricing.totalPaidTaxIncl) / result.pricing?.totalProductsTaxIncl)

                let totalShippingFeeExcl = Number(result.pricing?.totalShippingTaxExcl * supplierPercentage).toFixed(2)

                let totalShippingFeeIncl = Number(result.pricing?.totalShippingTaxIncl * supplierPercentage).toFixed(2)

                let totalDiscountExcl = Number(result.pricing?.totalDiscountTaxExcl * supplierPercentage).toFixed(2)

                let totalDiscountIncl = Number(result.pricing?.totalDiscountTaxIncl * supplierPercentage).toFixed(2)

                let codFee = Number(result.pricing?.codFee * supplierPercentage).toFixed(2)

                let totalCreditUsed = Number(result.pricing?.creditUsed * supplierPercentage).toFixed(2)

                pricing.creditUsed = totalCreditUsed;

                pricing.codFee = codFee;

                pricing.totalShippingTaxExcl = totalShippingFeeExcl;

                pricing.totalDiscountTaxExcl = totalDiscountExcl;

                // for shiiping fees addition on invoice for suppliers individually

                pricing.totalPaidTaxExcl = (parseFloat(pricing.totalPaidTaxExcl) + parseFloat(totalShippingFeeExcl) + parseFloat(codFee))
                    .toFixed(2);

                pricing.totalPaidTaxIncl = (parseFloat(pricing.totalPaidTaxIncl) + parseFloat(totalShippingFeeIncl) + parseFloat(codFee))
                    .toFixed(2);

                // For discount reduction on invoice for suppliers individually

                pricing.totalPaidTaxExcl = (parseFloat(pricing.totalPaidTaxExcl) - parseFloat(totalDiscountExcl))
                    .toFixed(2);

                pricing.totalPaidTaxIncl = (parseFloat(pricing.totalPaidTaxIncl) - parseFloat(totalDiscountIncl))
                    .toFixed(2);

                pricing.vat = (pricing?.totalPaidTaxIncl - pricing?.totalPaidTaxExcl).toFixed(2)

                /** COD Amount For Salasa */

                if (result.paymentInfo.paidWith === 'CASH') {
                    pricing.codAmountSalasa = (pricing.totalPaidTaxIncl - totalCreditUsed).toFixed(2);
                }

                /** Supplier Order Status For Order Detail of Portal */

                let supplierOrderStatus = await link.from('order_supplier_status as oss')
                    .innerJoin('supplier_statuses as ss', 'oss.id_status', 'ss.id')
                    .where('oss.id_supplier', key)
                    .where('oss.id_order', id)
                    .first('oss.id_status', 'ss.status')

                productDetails.push({
                    supplierId : key,
                    status : (supplierOrderStatus) ? supplierOrderStatus.status : 'N/A',
                    idStatus : (supplierOrderStatus) ? supplierOrderStatus.id_status : null,
                    products: value,
                    pricing
                })

                productsToGetDetails = [... productsToGetDetails, ... value.map((val)=> val.id_product) ]
                suppliersToGetDetails.push(key)
            }

            const supplierAndProductDetails = await this.getsupplierAndProductDetails(productsToGetDetails, suppliersToGetDetails, result.marketplace)

            let supplierDeliveryInformation = await link('order_supplier_shipments')
                    .select('id_carrier_partner', 'id_order', 'id_supplier', 'tracking_number', 'tracking_url', 'awb_filepath')
                    .where({ id_order: id, deleted_at: null })

            if (supplierDeliveryInformation.length) {
                supplierDeliveryInformation = groupBy(supplierDeliveryInformation,'id_supplier')
            }

            if (supplierAndProductDetails?.products?.length &&  supplierAndProductDetails.suppliers){

                let productStockAndImages = supplierAndProductDetails.products
                productStockAndImages = groupBy(productStockAndImages, 'productId')
                for (let index = 0; index < productDetails.length; index++) {
                    
                    const orderItem = productDetails[index]

                    orderItem.supplierName = orderItem.supplierName =
                        supplierAndProductDetails.suppliers
                            ?.find((supplier) => supplier.id === orderItem.supplierId)
                            ?.name

                    orderItem.vatNumber =
                        supplierAndProductDetails.suppliers
                        ?.find((supplier) => supplier.id === orderItem.supplierId)
                        ?.vatNumber

                    orderItem.phoneNumber =
                        supplierAndProductDetails.suppliers
                            ?.find((supplier) => supplier.id === orderItem.supplierId)
                            ?.phone

                    orderItem.location =
                        supplierAndProductDetails.suppliers
                            ?.find((supplier) => supplier.id === orderItem.supplierId)
                            ?.location
                    
                    orderItem.deliveryInformation = supplierDeliveryInformation[orderItem.supplierId] && supplierDeliveryInformation[orderItem.supplierId][0] ? supplierDeliveryInformation[orderItem.supplierId][0] : null

                    for (let innerIndex = 0; innerIndex < orderItem.products.length; innerIndex++) {
                        const item = orderItem.products[innerIndex];
                        const currentProduct = productStockAndImages[item.id_product]

                        suppliersTotal += Number(item.total_price_tax_incl)

                        if (currentProduct?.length) {
                            const specificAttributedProduct = groupBy(currentProduct, 'idProductAttribute')[item.id_product_attribute][0]
                            item.availableQuantity = specificAttributedProduct?.quantity
                            item.image = specificAttributedProduct?.attributeImage || specificAttributedProduct?.image
                            item.image = `${cloudfront_url}${product_bucket}${item.image}`;
                        }

                        delete item.id_supplier
                    }
                }
            }

            result.products = productDetails

            result.deliveryInformation = {
                deliveryOption: 'N/A',
                deliveryPartner: 'N/A',
                trackingUrl: 'N/A',
                trackingNumber: 'N/A',
                deliveryStatus : 'N/A',
                awbFilePath: 'N/A'
            }

            let deliveryPartnerInformation = null;

            const deliveryInformation = await this.getDeliveryInformation(result.carrierId)

            if (result.carrierPartner) {
                deliveryPartnerInformation = await this.getDeliveryPartner(result.carrierPartner)
            }

            if (deliveryInformation) {
                result.deliveryInformation = {
                    deliveryOption: deliveryInformation.name,
                    trackingNumber: result.trackingNumber || 'N/A',
                    deliveryPartner: (deliveryPartnerInformation) ? deliveryPartnerInformation.name : 'N/A',
                    trackingUrl: result.trackingUrl || 'N/A',
                    awbFilePath: result.awbFilePath || 'N/A',
                    deliveryStatus : 'N/A'
                }
            }

            const billingInformation = await this.getAddress(result.billingAddressId)

            const shippingInformation = await this.getAddress(result.shippingAddressId)

            const customerDetails = await this.getCustomerDetails(result.customerId)
            result.customerDetails = customerDetails?.length ? customerDetails[0] : null

            if (billingInformation && result.customerDetails)
                result.customerDetails.billingAddress = billingInformation

            if (shippingInformation && result.customerDetails)
                result.customerDetails.shippingAddress = {
                    address: `${shippingInformation.address}`,
                    longitude: shippingInformation.longitude,
                    latitude: shippingInformation.latitude,
                    city: shippingInformation.city,
                    country: shippingInformation.country,
                    isoCode: shippingInformation.isoCode
                }
        }

        delete result.carrierId
        delete result.shippingAddressId
        delete result.billingAddressId
        delete result.customerId
        delete result.trackingNumber
        delete result.carrierPartner
        delete result.trackingUrl
        delete result.awbFilePath

        if (id_supplier) {
            result.pricing = {
                totalProductsTaxIncl: suppliersTotal.toFixed(2)
            }
        }

        product.data = result
        return product;
    }

    model.productDetail = async function productDetail(item, i8ln, forOrderUpdate = false, forPaymentCallbacks = false) {

        const { locale, countryIso, cofeCustomerToken } = i8ln;

        let productDetail = {}

        const { idProduct, idProductAttribute } = item;

        let headers = { 'locale': locale, 'country-iso': countryIso }

        let path = `${productModuleUrl}${API_URLS.PRODUCT_DETAIL}${idProduct}`

        if (cofeCustomerToken)
            headers = { 'locale': locale, 'country-iso': countryIso, 'cofe-customer-token': cofeCustomerToken }

        if (forOrderUpdate) {
            headers = {}
            path = `${productModuleUrl}${API_URLS.PRODUCT_DETAIL}${idProduct}?fromDashboard=true`
        }

        if (forPaymentCallbacks) {
            headers = { 'country-iso': countryIso, locale }
        }

        try {
            const products = await httpRequest.send({
                path,
                method: 'GET',
                headers,
                json: true
            });

            const product = products.data;

            if (product) {

                let result = product[0];

                productDetail = result;

                const { images, productAttributes } = result;

                productDetail.name = result.name;
                productDetail.reference = result.reference;
                productDetail.attributes = null;
                productDetail.finalPrice = result.finalPrice;
                productDetail.idSupplier = result.idSupplier;
                productDetail.currency = result.currency;

                if (result.product_metadata) {
                    productDetail.product_metadata = result.product_metadata
                }

                let coverImage = images.filter(x => x.cover == true)

                if (coverImage?.length) {
                    productDetail.productImage = coverImage[0].imageUrl;
                } else {
                    if (images?.length)
                        productDetail.productImage = images[0].imageUrl;
                    else
                        productDetail.productImage = default_image_url;
                }

                let selectedAttribute = productAttributes.filter(x => x.id == idProductAttribute)

                if (selectedAttribute && selectedAttribute.length > 0) {

                    let attribute = selectedAttribute[0];

                    productDetail.reference = attribute.reference;

                    if (attribute.images?.length)
                        productDetail.productImage = attribute.images[0].imageUrl;

                    productDetail.price = attribute.price;
                    productDetail.finalPrice = attribute.finalPrice;
                    productDetail.priceTaxExcl = attribute.priceTaxExcl;

                    productDetail.attributes = attribute.attributes.map((attr) => attr.attributeName).join(', ');
                }
            }

        } catch (ex) {
            logger.error({ msg: 'Product Fetching Error> getProduct  > error >', ex });
        }

        return productDetail;
    }

    model.getCustomerDetails = async function getCustomerDetails(customerId, customerName = null) {

        const requestData = { customerId };

        if (customerName && customerName != null) {
            requestData.customerName = customerName;
        }

        const customer = await httpRequest.send({
            path: `${coreModuleUrl}${API_URLS.GET_CUSTOMER_DETAILS}`,
            method: 'POST',
            params: requestData,
            json: true
        });

        let result = customer?.data

        if (!result?.length)
            throw Boom.notFound('Customer details not found.');

        return result;
    }

    model.getSupplierDetails = async function getSupplierDetails(supplierId) {

        const supplier = await httpRequest.send({
            path: `${productModuleUrl}${API_URLS.GET_SUPPLIER_DETAILS}${supplierId}`,
            method: 'GET',
            json: true
        });

        let result = supplier?.data

        if (!result)
            throw Boom.notFound('Supplier details not found.');

        return result;
    }

    /** ====== Online Payment Callbacks ====== **/

    model.paymentWebHook = async function paymentWebHook(body) {
        // to be continued
       return body;
    }

    model.paymentCallBack = async function paymentCallBack(body, emailsPayload = null) {

        const { referenceOrderId, paymentStatus, rawResponse } = body;

        const result = { redirect: "", trackid: referenceOrderId, paymentMethod: 'SAVED_CARD', alreadyProcessed: false };

        let currentPaymentState = await link.from('orders').where('id', referenceOrderId).first('payment_status')

        if (currentPaymentState.payment_status === rawResponse.status) {
            result.alreadyProcessed = true;
            return { data: result };
        }

        const [ updateTransaction ] = await link('order_payment_transaction')
            .update({ approved: rawResponse.approved, payment_status: rawResponse.status })
            .where({ id_order: referenceOrderId })
            .returning('*')

        let currentState = await link.from('order_states').where('name', 'Process In Progress').first('id')

        let orderDeviceType = await link.from('order_device_type').where('id_order', referenceOrderId).first('device_type')

        if (paymentStatus === 'PAYMENT_SUCCESS') {
            const [updatedOrder] = await link('orders')
                .update({ current_state: currentState.id, payment_status: rawResponse.status, is_valid: true })
                .where({ id: referenceOrderId })
                .returning('*')

            let updateTransactionId = (updateTransaction) ? updateTransaction.id : null

            const [orderPayment] = await link('order_payment')
                .update({ transaction_id: updateTransactionId, card_number: rawResponse.source.last4,
                    card_brand: rawResponse.source.scheme,
                    card_exp: `${rawResponse.source.expiry_month}/${rawResponse.source.expiry_year}` })
                .where({ id_order: referenceOrderId })
                .returning('*')

            let creditsUsed = parseFloat(orderPayment.credit_used);

            if (creditsUsed > 0) {

                let checkoutPayload = {
                    payment: {
                        paymentType: 'CREDIT', paymentScheme: 'CREDIT',
                        isoCurrencyCode: orderPayment.currency, isoCountryCode: updatedOrder.marketplace
                    }, metadata: {
                        language: 'en', orderSource: 'Mobile', creditsUsed,
                        referenceOrderId,
                        externalCustomerId: updatedOrder.id_customer, internalCustomerId: updatedOrder.cofe_customer_id,
                        customerPhoneNumber: updatedOrder.cofe_customer_phone
                    }
                }

                this.checkoutPayment(checkoutPayload).then((r) => { console.log('Wallet Deduction'); });
            }

            if (orderDeviceType.device_type === 'website') {
                result.redirect = `${websiteBaseUrl}checkout/checkout-success`;
            } else {
                result.redirect = 'cofeecom://redirect';
            }

             // invalidate Cart
            await this.invalidateCart(updatedOrder.id_cart);

            const orderProducts = await link.from('order_details')
                .select('id_product as idProduct', 'id_product_attribute as idProductAttribute',
                    'product_quantity as quantity', 'id_supplier')
                .where('id_order', referenceOrderId)

            // Update Products Current Stock
            await this.updateProductsStock(orderProducts);

            const notification = {
                "heading" : {
                    "en": i18n.getCatalog('en').order_successful,
                    "ar" : i18n.getCatalog('ar').order_successful
                },
                "message" : {
                    "en": i18n.getCatalog('en').order_success_desc,
                    "ar": i18n.getCatalog('ar').order_success_desc
                }
            }

            const data = { "deeplink" : `${deepLink}order?id=${referenceOrderId}`, referenceOrderId }

            this.sendPushNotification(referenceOrderId, updatedOrder.cofe_customer_id, MARKETPLACE_ORDER_DETAIL, notification, data).then((r) => {
                console.log('Notified To Customer');
            });

            let currentDate = moment(updatedOrder.created_at).format('YYYY-MM-DD');

            const slackData = { 'OrderId': referenceOrderId, 'Reference': updatedOrder.reference, 'PaymentMethod': orderPayment.payment_method,
                'TotalAmount': parseFloat(updatedOrder.total_paid_tax_incl), 'Marketplace': updatedOrder.marketplace,
                'orderDate': currentDate
            }

            this.sendOrderSlackNotification(slackData).then((r) => { console.log('Notified To Operations'); });

            if (supplierSMS) {

                const smsData = { 'Reference': updatedOrder.reference, orderId: referenceOrderId, 'Marketplace': updatedOrder.marketplace, 'orderItems': orderProducts }

                this.sendOrderSmsNotification(smsData).then((r) => {
                    console.log('Notified To Suppliers');
                });
            }

            if (!emailsPayload) {
                emailsPayload = await this.getEmailPayloadForCallbacks({ referenceOrderId, orderProducts, updatedOrder, orderPayment })
            }

            this.sendOrderEmails(emailsPayload).then((r) => { console.log('Order Confirmation Email sent.'); });

        } else {

            currentState = await link.from('order_states').where('name', 'Payment Failure').first('id')

            await link('orders')
                .update({ current_state: currentState.id, payment_status: rawResponse.status })
                .where({ id: referenceOrderId })
                .returning('*')

            if (orderDeviceType.device_type === 'website') {
                result.redirect = `${websiteBaseUrl}checkout/checkout-failure`;
            } else {
                result.redirect = 'cofeecom://failure';
            }
        }

        await link('order_history').insert({
            id: guid.v4(),
            id_order: referenceOrderId,
            id_employee: default_uuid,
            id_order_state: currentState.id
        })

        // to be continued
        return { data: result };
    }

    /** My Fatoorah Payment Callback */

    model.paymentMfCallBack = async function paymentMfCallBack(data) {

        const { body } = data;

        const { referenceOrderId, paymentStatus, rawResponse } = body;

        const result = { redirect: "", trackid: referenceOrderId, paymentMethod: 'CARD', alreadyProcessed: false };

        let currentState = await link.from('order_states').where('name', 'Process In Progress').first('id')

        let orderDeviceType = await link.from('order_device_type').where('id_order', referenceOrderId).first('device_type')

        let currentPaymentState = await link.from('orders').where('id', referenceOrderId).first('payment_status')

        if (currentPaymentState.payment_status === rawResponse.InvoiceStatus) {
            result.alreadyProcessed = true;
            return { data: result };
        }

        if (paymentStatus === 'PAYMENT_SUCCESS') {
            const [updatedOrder] = await link('orders')
                .update({ current_state: currentState.id, payment_status: rawResponse.InvoiceStatus, is_valid: true })
                .where({ id: referenceOrderId })
                .returning('*')

            const [orderPayment] = await link('order_payment').where({ id_order: referenceOrderId })
                .returning('*')

            let creditsUsed = parseFloat(orderPayment.credit_used);

            if (creditsUsed > 0) {

                let checkoutPayload = {
                    payment: {
                        paymentType: 'CREDIT', paymentScheme: 'CREDIT',
                        isoCurrencyCode: orderPayment.currency, isoCountryCode: updatedOrder.marketplace
                    }, metadata: {
                        language: 'en', orderSource: 'Mobile', creditsUsed,
                        referenceOrderId,
                        externalCustomerId: updatedOrder.id_customer, internalCustomerId: updatedOrder.cofe_customer_id,
                        customerPhoneNumber: updatedOrder.cofe_customer_phone
                    }
                }

                this.checkoutPayment(checkoutPayload).then((r) => { console.log('Wallet Deduction'); });
            }

            if (orderDeviceType.device_type === 'website') {
                result.redirect = `${websiteBaseUrl}checkout/checkout-success`;
            } else {
                result.redirect = 'cofeecom://redirect';
            }

            // invalidate Cart
            await this.invalidateCart(updatedOrder.id_cart);

            const orderProducts = await link.from('order_details')
                .select('id_product as idProduct', 'id_product_attribute as idProductAttribute',
                    'product_quantity as quantity', 'id_supplier')
                .where('id_order', referenceOrderId)

            // Update Products Current Stock
            await this.updateProductsStock(orderProducts);

            const notification = {
                "heading" : {
                    "en": i18n.getCatalog('en').order_successful,
                    "ar" : i18n.getCatalog('ar').order_successful
                },
                "message" : {
                    "en": i18n.getCatalog('en').order_success_desc,
                    "ar": i18n.getCatalog('ar').order_success_desc
                }
            }

            const data = { "deeplink" : `${deepLink}order?id=${referenceOrderId}`, referenceOrderId }

            this.sendPushNotification(referenceOrderId, updatedOrder.cofe_customer_id, MARKETPLACE_ORDER_DETAIL, notification, data).then((r) => {
                console.log('Notified To Customer');
            });

            let currentDate = moment(updatedOrder.created_at).format('YYYY-MM-DD');

            const slackData = { 'OrderId': referenceOrderId, 'Reference': updatedOrder.reference, 'PaymentMethod': orderPayment.payment_method,
                'TotalAmount': parseFloat(updatedOrder.total_paid_tax_incl), 'Marketplace': updatedOrder.marketplace,
                'orderDate': currentDate
            }

            this.sendOrderSlackNotification(slackData).then((r) => { console.log('Notified To Operations'); });

            if (supplierSMS) {

                const smsData = { 'Reference': updatedOrder.reference, orderId: referenceOrderId, 'Marketplace': updatedOrder.marketplace, 'orderItems': orderProducts }

                this.sendOrderSmsNotification(smsData).then((r) => {
                    console.log('Notified To Suppliers');
                });
            }

            const emailsPayload = await this.getEmailPayloadForCallbacks({ referenceOrderId, orderProducts, updatedOrder, orderPayment })

            this.sendOrderEmails(emailsPayload).then((r) => { console.log('Order Confirmation Email sent.'); });
        } else {

            currentState = await link.from('order_states').where('name', 'Payment Failure').first('id')

            await link('orders')
                .update({ current_state: currentState.id, payment_status: 'Declined' })
                .where({ id: referenceOrderId })
                .returning('*')

            if (orderDeviceType.device_type === 'website') {
                result.redirect = `${websiteBaseUrl}checkout/checkout-failure`;
            } else {
                result.redirect = 'cofeecom://failure';
            }
        }

        await link('order_history').insert({
            id: guid.v4(),
            id_order: referenceOrderId,
            id_employee: default_uuid,
            id_order_state: currentState.id
        })

        // to be continued
        return { data: result };
    }

    /** TAP Payment Callback */

    model.paymentTapCallBack = async function paymentTapCallBack(data) {

        const { body } = data;

        const { referenceOrderId, paymentStatus, rawResponse } = body;

        const result = { redirect: "", trackid: referenceOrderId, paymentMethod: 'CARD', alreadyProcessed: false };

        let currentState = await link.from('order_states').where('name', 'Process In Progress').first('id')

        let orderDeviceType = await link.from('order_device_type').where('id_order', referenceOrderId).first('device_type')

        let currentPaymentState = await link.from('orders').where('id', referenceOrderId).first('payment_status')

        if (currentPaymentState.payment_status === rawResponse.status) {
            result.alreadyProcessed = true;
            return { data: result };
        }

        if (paymentStatus === 'PAYMENT_SUCCESS') {
            const [updatedOrder] = await link('orders')
                .update({ current_state: currentState.id, payment_status: rawResponse.status, is_valid: true })
                .where({ id: referenceOrderId })
                .returning('*')

            const [orderPayment] = await link('order_payment').where({ id_order: referenceOrderId })
                .returning('*')

            let creditsUsed = parseFloat(orderPayment.credit_used);

            if (creditsUsed > 0) {

                let checkoutPayload = {
                    payment: {
                        paymentType: 'CREDIT', paymentScheme: 'CREDIT',
                        isoCurrencyCode: orderPayment.currency, isoCountryCode: updatedOrder.marketplace
                    }, metadata: {
                        language: 'en', orderSource: 'Mobile', creditsUsed,
                        referenceOrderId,
                        externalCustomerId: updatedOrder.id_customer, internalCustomerId: updatedOrder.cofe_customer_id,
                        customerPhoneNumber: updatedOrder.cofe_customer_phone
                    }
                }

                this.checkoutPayment(checkoutPayload).then((r) => { console.log('Wallet Deduction'); });
            }

            if (orderDeviceType.device_type === 'website') {
                result.redirect = `${websiteBaseUrl}checkout/checkout-success`;
            } else {
                result.redirect = 'cofeecom://redirect';
            }

            // invalidate Cart
            await this.invalidateCart(updatedOrder.id_cart);

            const orderProducts = await link.from('order_details')
                .select('id_product as idProduct', 'id_product_attribute as idProductAttribute',
                    'product_quantity as quantity', 'id_supplier')
                .where('id_order', referenceOrderId)

            // Update Products Current Stock
            await this.updateProductsStock(orderProducts);

            const notification = {
                "heading" : {
                    "en": i18n.getCatalog('en').order_successful,
                    "ar" : i18n.getCatalog('ar').order_successful
                },
                "message" : {
                    "en": i18n.getCatalog('en').order_success_desc,
                    "ar": i18n.getCatalog('ar').order_success_desc
                }
            }

            const data = { "deeplink" : `${deepLink}order?id=${referenceOrderId}`, referenceOrderId }

            this.sendPushNotification(referenceOrderId, updatedOrder.cofe_customer_id, MARKETPLACE_ORDER_DETAIL, notification, data).then((r) => {
                console.log('Notified To Customer');
            });

            let currentDate = moment(updatedOrder.created_at).format('YYYY-MM-DD');

            const slackData = { 'OrderId': referenceOrderId, 'Reference': updatedOrder.reference, 'PaymentMethod': orderPayment.payment_method,
                'TotalAmount': parseFloat(updatedOrder.total_paid_tax_incl), 'Marketplace': updatedOrder.marketplace,
                'orderDate': currentDate
            }

            this.sendOrderSlackNotification(slackData).then((r) => { console.log('Notified To Operations'); });

            if (supplierSMS) {

                const smsData = { 'Reference': updatedOrder.reference, orderId: referenceOrderId, 'Marketplace': updatedOrder.marketplace, 'orderItems': orderProducts }

                this.sendOrderSmsNotification(smsData).then((r) => {
                    console.log('Notified To Suppliers');
                });
            }

            const emailsPayload = await this.getEmailPayloadForCallbacks({ referenceOrderId, orderProducts, updatedOrder, orderPayment })

            this.sendOrderEmails(emailsPayload).then((r) => { console.log('Order Confirmation Email sent.'); });
        } else {

            currentState = await link.from('order_states').where('name', 'Payment Failure').first('id')

            await link('orders')
                .update({ current_state: currentState.id, payment_status: 'Declined' })
                .where({ id: referenceOrderId })
                .returning('*')

            if (orderDeviceType.device_type === 'website') {
                result.redirect = `${websiteBaseUrl}checkout/checkout-failure`;
            } else {
                result.redirect = 'cofeecom://failure';
            }
        }

        await link('order_history').insert({
            id: guid.v4(),
            id_order: referenceOrderId,
            id_employee: default_uuid,
            id_order_state: currentState.id
        })

        // to be continued
        return { data: result };
    }

    model.checkoutPayment = async function checkoutPayment(payload) {

        const response = await httpRequest.send({
            path: `${cofeDistrictUrl}${API_URLS.CHECKOUT_PAY}`,
            method: 'POST',
            headers: { 'service-exchange-key': serviceExchangeKey },
            params:  payload,
            json: true
        });

        if(!response.payment)
            throw Boom.forbidden('Payment Failure', { subcode: 7000001 });

        return response;
    }

    /** =====  Order Tax Invoice ====== **/

    model.generateTaxInvoice = async function generateTaxInvoice(orderId) {

        const invoiceNumber = (length= 6) => Math.random().toString(20).substr(2, length)

        let params = { id: orderId };

        const orderDetails = await this.getDetailForTaxInvoice({ params } );

        const invoiceData = orderDetails.data;

        let orderReference = invoiceData.orderReference;

        invoiceData.invoiceNumber = invoiceNumber().toUpperCase();

        const options = {
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process', // <- this one doesn't works in Windows
                '--disable-gpu'
            ],
            headless: true
        }

        if (config.env === 'production') {
            options['executablePath'] = '/usr/bin/google-chrome-stable';
        }

        if (config.env === 'development') {
            if (config.useCustomChromiumExecutable === 'true') {
                options['executablePath'] = config.chromiumPath;
            }
        }

        const browser = await puppeteer.launch(options);

        const page =  await browser.newPage();

        const filepath = path.join(process.cwd(), 'src/templates', 'tax-invoice.hbs');

        const html = await fs.readFileSync(filepath, 'utf-8');

        const content = handlebars.compile(html)(invoiceData)

        await page.setContent(content);

        await page.pdf({
            path: `${orderReference}.pdf`,
            format: "A4",
            printBackground: true
        })

        const invoiceUrl = await this.uploadTaxInvoice(orderReference, 'taxInvoices');

        if (invoiceUrl) {
            await link('order_tax_invoice').insert({
                id: guid.v4(),
                id_order: orderId,
                invoice_number: invoiceData.invoiceNumber,
                url: invoiceUrl
            })
        }

        return invoiceUrl;
    }

    model.uploadTaxInvoice = async function uploadTaxInvoice(orderReference, folder) {

        const form = new formData();

        form.append('files', fs.createReadStream(`${orderReference}.pdf`));

        const uploadResponse = await httpRequest.send({
            path: `${productModuleUrl}${API_URLS.UPLOAD}`,
            method: 'POST',
            params: form,
            headers: { ...form.getHeaders(), folder },
            json: true
        });

        let result = uploadResponse?.data

        if (!result?.length)
            throw Boom.notFound('File Not Uploaded.');

        await fs.unlinkSync(`${orderReference}.pdf`)

        return result[0].image;
    }

    model.getDetailForTaxInvoice = async function getDetailForTaxInvoice({ params }) {

        const { id } = params

        const order = {}

        let _link = link
            .select(
                'o.id as _orderId',
                'o.reference as _orderReference',
                'o.eta_days as _etaDays',
                'o.created_at as _orderDate',
                'o.id_address_delivery as _shippingAddressId',
                'o.delivery_address as _deliveryAddress',
                'o.id_customer as _customerId',
                'o.marketplace as _marketplace',
                'op.currency as _paymentInfo_currency',
                'o.total_products_tax_incl as _pricing_totalProductsTaxIncl',
                'o.total_products_tax_excl as _pricing_totalProductsTaxExcl',
                'o.total_paid_tax_incl as _pricing_totalPaidTaxIncl',
                'o.total_paid_tax_excl as _pricing_totalPaidTaxExcl',
                'o.total_discounts_tax_excl as _pricing_totalDiscountTaxExcl',
                'o.total_discounts_tax_incl as _pricing_totalDiscountTaxIncl',
                'o.total_shipping_tax_excl as _pricing_totalShippingTaxExcl',
                'o.total_shipping_tax_incl as _pricing_totalShippingTaxIncl',
                'o.cod_fee as _pricing_codFee'
            )
            .from('orders as o')
            .innerJoin('order_payment as op', 'op.id_order', 'o.id')
            .where('o.id', id)

        let result = await _link;

        result = knexnest.nest(result);

        if (result?.length){

            result = result.pop()

            result.orderDate = moment(result.orderDate, 'MMMM Do YYYY').tz(timezone).format('MMMM Do YYYY')

            // order details ...
            let products = await link
                .select(
                    'od.id_supplier',
                    'od.id_product',
                    'od.id_product_attribute',
                    'od.product_name',
                    'od.product_reference',
                    'od.product_quantity',
                    'od.unit_price_tax_incl',
                    'od.unit_price_tax_excl',
                    'od.total_price_tax_excl',
                    'od.total_price_tax_incl',
                    'od.reduction_amount_tax_incl',
                    'od.reduction_amount_tax_excl',
                    'od.vat_rate',
                    'od.tax_amount'
                )
                .from('order_details as od')
                .where('od.id_order', id)

            let supplierIds = uniq(map(products, 'id_supplier'));

            let suppliers = await mdlProductStatus.getSuppliers(supplierIds);

            if (suppliers.data)
                suppliers = groupBy(suppliers.data,'id')

            products.map((product) => {
                if (suppliers[product.id_supplier][0]['businessModel'] === 'Retail')
                    product.id_supplier = cofeSuppliers[result.marketplace];
            })

            products = groupBy(products,'id_supplier');

            const productDetails = [];

            for (const [key, value] of Object.entries(products)) {

                const supplierInformation =  await this.getSupplierDetails(key)

                let pricing = { totalProductsTaxExcl: 0, totalProductsTaxIncl: 0, totalPaidTaxIncl : 0, vat: 0,
                    totalPaidTaxExcl: 0, totalShippingTaxExcl: 0, totalShippingTaxIncl: 0, 
                    totalDiscountTaxExcl: 0, totalDiscountTaxIncl: 0 
                };

                value.map((val) => {

                    pricing.totalProductsTaxExcl = (parseFloat(pricing.totalProductsTaxExcl) + parseFloat(val.total_price_tax_excl))
                        .toFixed(2)
                    pricing.totalProductsTaxIncl = (parseFloat(pricing.totalProductsTaxIncl) + parseFloat(val.total_price_tax_incl))
                        .toFixed(2)
                    pricing.totalPaidTaxIncl = (parseFloat(pricing.totalPaidTaxIncl) + parseFloat(val.total_price_tax_incl))
                        .toFixed(2)
                    pricing.totalPaidTaxExcl = (parseFloat(pricing.totalPaidTaxExcl) + parseFloat(val.total_price_tax_excl))
                        .toFixed(2)

                    if(val.reduction_amount_tax_excl == null){
                        val.reduction_amount_tax_excl = 0.00;
                        val.reduction_amount_tax_incl = 0.00;
                    } else {
                        val.reduction_amount_tax_excl = parseFloat(val.reduction_amount_tax_excl).toFixed(2);
                        val.reduction_amount_tax_incl = parseFloat(val.reduction_amount_tax_incl).toFixed(2);

                        val.unit_price_tax_excl = (parseFloat(val.unit_price_tax_excl) + parseFloat(val.reduction_amount_tax_excl))
                            .toFixed(2)

                        val.unit_price_tax_incl = (parseFloat(val.unit_price_tax_incl) + parseFloat(val.reduction_amount_tax_incl))
                            .toFixed(2)
                    }
                });

                let supplierPercentage = (parseFloat(pricing.totalPaidTaxIncl) / result.pricing?.totalProductsTaxIncl)

                let totalShippingFeeExcl = Number(result.pricing?.totalShippingTaxExcl * supplierPercentage).toFixed(2)

                let totalShippingFeeIncl = Number(result.pricing?.totalShippingTaxIncl * supplierPercentage).toFixed(2)

                let totalDiscountExcl = Number(result.pricing?.totalDiscountTaxExcl * supplierPercentage).toFixed(2)

                let totalDiscountIncl = Number(result.pricing?.totalDiscountTaxIncl * supplierPercentage).toFixed(2)

                let codFee = Number(result.pricing?.codFee * supplierPercentage).toFixed(2)

                pricing.codFee = codFee;

                pricing.totalShippingTaxExcl = totalShippingFeeExcl;

                pricing.totalDiscountTaxExcl = totalDiscountExcl;

                pricing.totalDiscountTaxIncl = totalDiscountIncl;

                pricing.totalShippingTaxIncl = totalShippingFeeIncl;

                // for shiiping fees addition on invoice for suppliers individually

                pricing.totalPaidTaxExcl = (parseFloat(pricing.totalPaidTaxExcl) + parseFloat(totalShippingFeeExcl) + parseFloat(codFee))
                    .toFixed(2);

                pricing.totalPaidTaxIncl = (parseFloat(pricing.totalPaidTaxIncl) + parseFloat(totalShippingFeeIncl) + parseFloat(codFee))
                    .toFixed(2);

                // For discount reduction on invoice for suppliers individually

                pricing.totalPaidTaxExcl = (parseFloat(pricing.totalPaidTaxExcl) - parseFloat(totalDiscountExcl))
                    .toFixed(2);

                pricing.totalPaidTaxIncl = (parseFloat(pricing.totalPaidTaxIncl) - parseFloat(totalDiscountIncl))
                    .toFixed(2);

                pricing.vat = (pricing?.totalProductsTaxIncl - pricing?.totalProductsTaxExcl).toFixed(2)
                
                let qrCode = null;

                if (result.paymentInfo.currency === 'SAR') {

                    // Creating the data
                    let qrData = {
                        email: supplierInformation.email,
                        vatNumber: (supplierInformation.vat_number) ? supplierInformation.vat_number : null,
                        orderDate: result.orderDate,
                        totalAmount: pricing.total_products_tax_incl,
                        totalTaxAmount: pricing.vat
                    }

                    // Converting the data into String format
                    let qrStringdata = JSON.stringify(qrData);

                    QRCode.toDataURL(qrStringdata, function (err, code) {
                        if(err) return console.log("error occurred")

                        qrCode = code;
                    })
                
                }

                productDetails.push({
                    supplierId : key,
                    supplierInformation: await this.getSupplierDetails(key),
                    pricing,
                    products: value,
                    qrCode
                })
            }

            const shippingInformation = await this.getAddress(result.shippingAddressId)

            if (result.deliveryAddress) {
                shippingInformation.address = result.deliveryAddress; 
            }

            const customerDetails = await this.getCustomerDetails(result.customerId)
            result.customerDetails = customerDetails?.length ? customerDetails[0] : null

            if (shippingInformation && result.customerDetails)
                result.customerDetails.shippingAddress = shippingInformation

            result.products = productDetails;
        }

        order.data = result
        return order;
    }

    model.customerOrdersByStates = function customerOrdersByStates(idCustomer, countryIso, isCompleted = false) {

        let _link = link
            .select(
                'o.id as _id',
                'o.reference as _reference',
                'o.created_at as _orderDate',
                'o.updated_at as _lastUpdatedDate',
                'os.name as _orderStatus',
                'oc.tracking_url as _trackingUrl',
            )
            .from('orders as o')
            .where('o.id_customer', idCustomer)
            .whereILike('o.marketplace', countryIso)
            .innerJoin('order_states as os', 'o.current_state', 'os.id')
            .leftOuterJoin('order_carrier as oc', 'o.id', 'oc.id_order')
            .orderBy('o.created_at', 'desc')
            .whereNotIn('current_state', failureStateIds)

        if (isCompleted) {
            _link.whereIn('current_state', completedStateIds)
        } else {
            _link.whereNotIn('current_state', completedStateIds).limit(5)
        }
        return _link;
    }

    /** ===== Push Notification ===== */

    model.sendPushNotification = async function sendPushNotification(orderId, CofeCustomerId, type, notification, data)
    {

        const sendNotification = await httpRequest.send({
            path: `${cofeDistrictUrl}${API_URLS.SEND_PUSH_NOTIFICATION}`,
            method: 'POST',
            headers: {'service-exchange-key': serviceExchangeKey},
            params: {customer_id: CofeCustomerId, type, notification, data},
            json: true
        });

        return sendNotification;
    }

    model.sendOrderSlackNotification = async function sendOrderSlackNotification(data)
    {
        let webhook = null;
        let text = `New order has been placed on ${data.Marketplace}`;

        if (data.Marketplace === 'AE') {
            webhook = slackOrderHooks.AE;
        } else if (data.Marketplace === 'SA') {
            webhook = slackOrderHooks.SA;
        } else if (data.Marketplace === 'KW') {
            webhook = slackOrderHooks.KW;
        }

        const sendNotification = await httpRequest.send({
            path: `${cofeDistrictUrl}${API_URLS.SEND_SLACK_NOTIFICATION}`,
            method: 'POST',
            headers: {'service-exchange-key': serviceExchangeKey},
            params: {text, data, webhook},
            json: true
        });

        return sendNotification;
    }

    model.sendOrderSmsNotification = async function sendOrderSmsNotification(data)
    {
        
        let content = `You have received a new order #${data.Reference} ${portalUrl}/orders/${data.orderId}`;

        let requestData = { "receiverInfo": [], content, referenceId: data.orderId }
        
        let smsNumbers = [];

        const orderSuppliers = uniqBy(data.orderItems, 'id_supplier')

        const supplierIds = orderSuppliers.map(s => s.id_supplier);
   
        let suppliers = await httpRequest.send({
            path: `${productModuleUrl}${API_URLS.BULK_SUPPLIERS}`,
            method: 'POST',
            params: { id_suppliers: supplierIds },
            json: true
        });

        if (suppliers.data) {
            const phoneNumbers = suppliers.data.map(s => s.phone);
            const servicePhones = suppliers.data.map(s => s.servicePhone);

            smsNumbers = union(phoneNumbers, servicePhones);    
        }

        if (smsNumbers.length > 0) {
            smsNumbers.map((number) => {
                requestData.receiverInfo.push({
                    'phone_number' : number,
                    'country' : data.Marketplace
                })
            })

            await httpRequest.send({
                path: `${cofeDistrictUrl}${API_URLS.SEND_SMS_NOTIFICATION}`,
                method: 'POST',
                headers: {'service-exchange-key': serviceExchangeKey},
                params: requestData,
                json: true
            });

        }

        return smsNumbers;
    }

    model.getAllProductStatus = async function getAllProductStatus () {
        return await mdlProductStatus.getAll()
    }

    model.getAllOrderStatus = async function getAllOrderStatus () {

        const result = await link
            .select( 'os.id', 'os.color', 'os.name')
            .from('order_states as os')
            .whereNull('os.deleted_at')

        return { data: result }
    }

    model.orderStatusUpdate = async function orderStatusUpdate (order) {

        const { id, id_status } = order;

        const status = await link.select('os.id','os.color','os.name')
            .from('order_states as os')
            .where('id', id_status)
            .whereNull('os.deleted_at').first()

        if (!status)
            throw new Error(`Invalid order status.`)

        const [ _order ] = await this.update({
                current_state: id_status,
                updated_at: this.now()
            }, { id },
            ['id','current_state', 'cofe_customer_id', 'id_customer', 'reference', 'total_paid_tax_incl', 'id_lang', 'marketplace', 'id_carrier', 'id_address_delivery', 'total_shipping_tax_incl', 'total_discounts_tax_incl', 'total_products_tax_incl', 'cod_fee', 'delivery_address']
        );

        if (!_order)
            throw new Error(`Order not found.`)

        /** Send Push Notifications with respect to status */

        if(notificationStates.indexOf(id_status) !== -1) {

            const notification = { "heading" : {}, "message" : {} }

            if (id_status === "d3e69e9f-afaa-4ebf-aabb-a12a01f1750e") {
                notification.heading.en = i18n.getCatalog('en').order_delivered;
                notification.heading.ar = i18n.getCatalog('ar').order_delivered;

                notification.message.en = i18n.getCatalog('en').order_delivered_desc;
                notification.message.ar = i18n.getCatalog('ar').order_delivered_desc;

                this.sendOrderEmails({ createdOrder: _order, on: 'order-delivered', id_lang: _order.id_lang }).then((r) => { console.log('Order delivery email sent.'); });
            }

            if (id_status === "ec465358-a1b1-44e3-a298-a14079f86825") {
                notification.heading.en = i18n.getCatalog('en').order_shipped;
                notification.heading.ar = i18n.getCatalog('ar').order_shipped;

                notification.message.en = i18n.getCatalog('en').order_shipped_desc;
                notification.message.ar = i18n.getCatalog('ar').order_shipped_desc;
            }

            if (id_status === "13d518d2-14fb-4014-a19a-efe21a74066e") {
                notification.heading.en = i18n.getCatalog('en').order_cancelled;
                notification.heading.ar = i18n.getCatalog('ar').order_cancelled;

                notification.message.en = i18n.getCatalog('en').order_cancelled_desc;
                notification.message.ar = i18n.getCatalog('ar').order_cancelled_desc;

                this.sendOrderEmails({ createdOrder: _order, on: 'order-cancelled', id_lang: _order.id_lang }).then((r) => { console.log('Order cancellation email sent.'); });
            }

            const data = { "deeplink" : `${deepLink}order?id=${id}`, id }

            this.sendPushNotification(id, _order.cofe_customer_id, MARKETPLACE_ORDER_DETAIL, notification, data)
                .then((r) => {
                    console.log('Notified To Customer');
                });
        }

        const data = { ... _order, status}

        return { data }
    }

    model.orderProductStatusUpdate = async function orderProductStatusUpdate (order) {
        return await mdlProductStatus.update(order)
    }

    model.productVatCalculation = async function productVatCalculation(price, vatRate) {

        let vat_amount = price * (vatRate / 100);

        let priceWithVat = +price + +vat_amount;

        priceWithVat = priceWithVat.toFixed(2);

        priceWithVat = parseFloat(priceWithVat);

        return priceWithVat;
    }

    model.sendOrderEmails = async function sendOrderEmails({ createdOrder, address, customer, paymentMethod, cartItems, id_lang, data, on = 'place-order' }) {

        const mailsToSend = []
        const operationsEmailReceivers = [];

        if (createdOrder.marketplace === 'AE') {
            operationsEmailReceivers.push(cofeOperationsEmailUAE)
        }

        if (createdOrder.marketplace === 'SA') {
            operationsEmailReceivers.push(cofeOperationsEmailKSA)
        }

        if (createdOrder.marketplace === 'KW') {
            operationsEmailReceivers.push(cofeOperationsEmailKWT)
        }

        const emailLanguage = id_lang === languages.ar ? 'ar' : 'en'
        const year = new Date().getFullYear().toString()

        if (on === 'place-order') {

            const currency = cartItems[0].product.currency

            const orderLink = `${cofePortalUrl}orders/${createdOrder.id}/`

            const deliveryInformation = await this.getDeliveryInformation(createdOrder.id_carrier)

            let products = ''
            cartItems.map((item) => {
                products += `
                    <tr>
                        <td style="width: 260px;border-bottom: 1px solid rgba(150, 182, 195, 0.4);">
                        <table class="cofe-product-title-image" border="0" cellpadding="0" cellspacing="0" style="width:100%;line-height: 20px;">
                            <tbody>
                            <tr>
                                <td style="padding: 20px 20px;width: 60px;" valign="top">
                                <span style="display: block;border: 1px solid rgba(150, 182, 195, 0.4);border-radius: 8px;width: 60px;height: 60px;text-align: center;padding:6px;box-sizing: border-box;">
                                    <img src="${item.product.productImage}" style="height:auto;max-height: 45px;position: relative;top: 50%;transform: translate(0, -50%);" alt="">
                                </span>
                                </td>
                                <td style="padding: 20px 15px 20px 0;${ id_lang === languages.ar ? 'text-align: right;' : ''}">
                                <p style="font-weight: 600;margin-bottom: 8px;">${ id_lang === languages.ar ? item.product.name_ar : item.product.name }</p>
                                <p style="color: #969696;">${item.product.attributes ? item.product.attributes: ''}</p>
                                </td>
                            </tr>
                            </tbody>
                        </table>
                        </td>
                        <td style="border-bottom: 1px solid rgba(150, 182, 195, 0.4);text-align: center;font-weight: 600">${item.quantity}</td>
                        <td style="border-bottom: 1px solid rgba(150, 182, 195, 0.4);text-align: center;font-weight: 600;color:#64BEBE;">${currency} ${Number(item.product.finalPrice).toFixed(2)}</td>
                    </tr>
                `
            })

            const discountAmount = `- ${currency} ${Number(createdOrder.total_discounts_tax_incl).toFixed(2)}`

            let replacements = {
                '{{customerName}}': `${customer.first_name} ${customer.last_name}`,
                '{{reference}}': `${createdOrder.reference}`,
                '{{shippingMethod}}': deliveryInformation ? deliveryInformation.name : 'N/A',
                '{{phoneNumber}}': customer.phone_number,
                '{{address}}': address.address,
                '{{paymentMethod}}': `${paymentMethod}`,
                '{{products}}': products,
                '{{subTotal}}': `${currency} ${Number(createdOrder.total_products_tax_incl).toFixed(2)}`,
                '{{total}}': `${currency} ${Number(createdOrder.total_paid_tax_incl).toFixed(2)}`,
                '{{shipping}}': `${currency} ${Number(createdOrder.total_shipping_tax_incl).toFixed(2)}`,
                '{{codFee}}': `${currency} ${Number(createdOrder.cod_fee).toFixed(2)}`,
                '{{discount}}': Number(createdOrder.total_discounts_tax_incl) ? translate('templates', `discount-row.${emailLanguage}.html`, { '{{discountAmount}}': discountAmount }) : '',
                '{{COFESupportEmail}}': cofeSupportEmail,
                '{{COFESupportPhone}}': cofeSupportPhone,
                '{{orderLink}}': orderLink,
                '{{trackingLink}}': data,
                '{{year}}': year,
            }

            // customer email notification.....
            let params = {
                subject: 'Thank you for your order!',
                html: translate('templates', `new-order-customer.${emailLanguage}.html`, replacements),
                receivers: [ customer.email ]
            }
            mailsToSend.push(this.sendMail(params))

            // when language is not english
            if (id_lang !== languages.en) {
                products = ''
                cartItems.map((item) => {
                    let productName = item.product.name

                    products += `
                        <tr>
                            <td style="width: 260px;border-bottom: 1px solid rgba(150, 182, 195, 0.4);">
                            <table class="cofe-product-title-image" border="0" cellpadding="0" cellspacing="0" style="width:100%;line-height: 20px;">
                                <tbody>
                                <tr>
                                    <td style="padding: 20px 20px;width: 60px;" valign="top">
                                    <span style="display: block;border: 1px solid rgba(150, 182, 195, 0.4);border-radius: 8px;width: 60px;height: 60px;text-align: center;padding:6px;box-sizing: border-box;">
                                        <img src="${item.product.productImage}" style="height:auto;max-height: 45px;position: relative;top: 50%;transform: translate(0, -50%);" alt="">
                                    </span>
                                    </td>
                                    <td style="padding: 20px 15px 20px 0;">
                                    <p style="font-weight: 600;margin-bottom: 8px;">${productName}</p>
                                    <p style="color: #969696;">${item.product.attributes ? item.product.attributes: ''}</p>
                                    </td>
                                </tr>
                                </tbody>
                            </table>
                            </td>
                            <td style="border-bottom: 1px solid rgba(150, 182, 195, 0.4);text-align: center;font-weight: 600">${item.quantity}</td>
                            <td style="border-bottom: 1px solid rgba(150, 182, 195, 0.4);text-align: center;font-weight: 600;color:#64BEBE;">${currency} ${Number(item.product.finalPrice).toFixed(2)}</td>
                        </tr>
                    `
                })

                replacements["{{products}}"] = products
            }

            // operations email notification ....
            params = {
                subject: `New Order - ${createdOrder.reference} - ${createdOrder.marketplace}`,
                html: translate('templates', `new-order-management.html`, replacements),
                receivers: operationsEmailReceivers
            }
            mailsToSend.push(this.sendMail(params))

            const suppliersProducts = groupBy(cartItems, 'product.idSupplier')

            // supplier email notification ....
            for (const [key, value] of Object.entries(suppliersProducts)) {

                const supplier =  await this.getSupplierDetails(key)

                let products = ''
                value.map((item) => products += `
                        <tr>
                            <td style="width: 260px;border-bottom: 1px solid rgba(150, 182, 195, 0.4);">
                            <table class="cofe-product-title-image" border="0" cellpadding="0" cellspacing="0" style="width:100%;line-height: 20px;">
                                <tbody>
                                <tr>
                                    <td style="padding: 20px 20px;width: 60px;" valign="top">
                                    <span style="display: block;border: 1px solid rgba(150, 182, 195, 0.4);border-radius: 8px;width: 60px;height: 60px;text-align: center;padding:6px;box-sizing: border-box;">
                                        <img src="${item.product.productImage}" style="height:auto;max-height: 45px;position: relative;top: 50%;transform: translate(0, -50%);" alt="">
                                    </span>
                                    </td>
                                    <td style="padding: 20px 15px 20px 0;${ id_lang === languages.ar ? 'text-align: right;' : ''}">
                                    <p style="font-weight: 600;margin-bottom: 8px;">${ id_lang === languages.ar ? item.product.name_ar : item.product.name }</p>
                                    <p style="color: #969696;">${item.product.attributes ? item.product.attributes: ''}</p>
                                    </td>
                                </tr>
                                </tbody>
                            </table>
                            </td>
                            <td style="border-bottom: 1px solid rgba(150, 182, 195, 0.4);text-align: center;font-weight: 600">${item.quantity}</td>
                            <td style="border-bottom: 1px solid rgba(150, 182, 195, 0.4);text-align: center;font-weight: 600;color:#64BEBE;">${currency} ${Number(item.product.finalPrice).toFixed(2)}</td>
                        </tr>
                    `
                )

                replacements = {
                    '{{supplierName}}': supplier.supplier_metadata.find((meta) => meta.id_lang === languages[emailLanguage]).name,
                    '{{reference}}': createdOrder.reference,
                    '{{products}}': products,
                    '{{orderLink}}': orderLink,
                    '{{year}}': year,
                    '{{COFESupportEmail}}': cofeSupportEmail,
                    '{{COFESupportPhone}}': cofeSupportPhone,
                }

                params = {
                    subject: `You have a new order ${createdOrder.reference}`,
                    html: translate('templates', `new-order-supplier.${emailLanguage}.html`, replacements),
                    receivers: [ supplier.email ]
                }

                mailsToSend.push(this.sendMail(params))
            }
        }

        if (on === 'order-cancelled') {
            const currencies = {
                'AE' : 'AED',
                'SA' : 'SAR',
                'KW' : 'KWD'
            }

            const currency = currencies[createdOrder.marketplace]

            const deliveryInformation = await this.getDeliveryInformation(createdOrder.id_carrier)

            let customerName = null

            let customer = await this.getCustomerDetails(createdOrder.id_customer)

            if (customer && customer.length) {
                customer = customer[0]
                customerName = `${customer.firstName} ${customer.lastName}` || 'N/A'
            }

            let address = 'N/A';

            if (createdOrder.delivery_address !== null) {
                 address = createdOrder.delivery_address;  
            } else {
                let oldAddress = await this.getAddress(createdOrder.id_address_delivery);

                if (oldAddress) {
                    address = address.address || 'N/A'
                }
            }

            const [ orderPayment ] = await link('order_payment').where({ id_order: createdOrder.id }).select('payment_method', 'transaction_id', 'card_number','card_brand')

            let paymentMethod = orderPayment.payment_method

            if (orderPayment && orderPayment.transaction_id) {
                const cardBrand = orderPayment.card_brand ? `(${orderPayment.card_brand})` : ''
                paymentMethod = `${orderPayment.payment_method} - xxxx xxxx xxxx ${orderPayment.card_number} ${cardBrand}`
            }

            let replacements = {
                '{{customerName}}': customerName,
                '{{reference}}': `#${createdOrder.reference}`,
                '{{shippingMethod}}': deliveryInformation ? deliveryInformation.name : 'N/A',
                '{{address}}': address,
                '{{paymentMethod}}': paymentMethod,
                '{{total}}': `${currency} ${Number(createdOrder.total_paid_tax_incl).toFixed(2)}`,
                '{{COFESupportEmail}}': cofeSupportEmail,
                '{{COFESupportPhone}}': cofeSupportPhone,
                '{{year}}': year,
            }

            let params = {
                subject: 'Your order has been cancelled!',
                html: translate('templates', `order-cancelled-customer.${emailLanguage}.html`, replacements),
                receivers: [ customer.email ]
            }

            mailsToSend.push(this.sendMail(params))
        }

        if (on === 'order-delivered') {
            const currencies = {
                'AE' : 'AED',
                'SA' : 'SAR',
                'KW' : 'KWD'
            }

            const currency = currencies[createdOrder.marketplace]

            const deliveryInformation = await this.getDeliveryInformation(createdOrder.id_carrier)

            let customerName = null

            let customer = await this.getCustomerDetails(createdOrder.id_customer)

            if (customer && customer.length) {
                customer = customer[0]
                customerName = `${customer.firstName} ${customer.lastName}` || 'N/A'
            }

            let address = 'N/A';

            if (createdOrder.delivery_address !== null) {
                 address = createdOrder.delivery_address;  
            } else {
                let oldAddress = await this.getAddress(createdOrder.id_address_delivery);

                if (oldAddress) {
                    address = address.address || 'N/A'
                }
            }
            
            const [ orderPayment ] = await link('order_payment').where({ id_order: createdOrder.id }).select('payment_method', 'transaction_id', 'card_number','card_brand')

            const orderProducts  = await link('order_details').where({ id_order: createdOrder.id }).select('product_name', 'product_name_ar', 'product_quantity', 'unit_price_tax_incl', 'product_image', 'attributes')

            let products = ''
            orderProducts.map((item) => {
                products += `
                    <tr>
                        <td style="width: 260px;border-bottom: 1px solid rgba(150, 182, 195, 0.4);">
                        <table class="cofe-product-title-image" border="0" cellpadding="0" cellspacing="0" style="width:100%;line-height: 20px;">
                            <tbody>
                            <tr>
                                <td style="padding: 20px 20px;width: 60px;" valign="top">
                                <span style="display: block;border: 1px solid rgba(150, 182, 195, 0.4);border-radius: 8px;width: 60px;height: 60px;text-align: center;padding:6px;box-sizing: border-box;">
                                    <img src="${cloudfront_url + product_bucket + item.product_image}" style="height:auto;max-height: 45px;position: relative;top: 50%;transform: translate(0, -50%);" alt="">
                                </span>
                                </td>
                                <td style="padding: 20px 15px 20px 0;${ id_lang === languages.ar ? 'text-align: right;' : ''}">
                                <p style="font-weight: 600;margin-bottom: 8px;">${id_lang === languages.en ? item.product_name: item.product_name_ar}</p>
                                <p style="color: #969696;">${item.attributes ? item.attributes: ''}</p>
                                </td>
                            </tr>
                            </tbody>
                        </table>
                        </td>
                        <td style="border-bottom: 1px solid rgba(150, 182, 195, 0.4);text-align: center;font-weight: 600">${item.product_quantity}</td>
                        <td style="border-bottom: 1px solid rgba(150, 182, 195, 0.4);text-align: center;font-weight: 600;color:#64BEBE;">${currency} ${Number(item.unit_price_tax_incl).toFixed(2)}</td>
                    </tr>
                `
            })

            let paymentMethod = orderPayment.payment_method

            if (orderPayment && orderPayment.transaction_id) {
                const cardBrand = orderPayment.card_brand ? `(${orderPayment.card_brand})` : ''
                paymentMethod = `${orderPayment.payment_method} - xxxx xxxx xxxx ${orderPayment.card_number} ${cardBrand}`
            }

            const discountAmount = `- ${currency} ${Number(createdOrder.total_discounts_tax_incl).toFixed(2)}`

            let replacements = {
                '{{customerName}}': customerName,
                '{{reference}}': createdOrder.reference,
                '{{products}}': products,
                '{{shippingMethod}}': deliveryInformation ? deliveryInformation.name : 'N/A',
                '{{address}}': address,
                '{{paymentMethod}}': paymentMethod,
                '{{subTotal}}': `${currency} ${Number(createdOrder.total_products_tax_incl).toFixed(2)}`,
                '{{discount}}': Number(createdOrder.total_discounts_tax_incl) ? translate('templates', `discount-row.${emailLanguage}.html`, { '{{discountAmount}}': discountAmount }) : '',
                '{{shipping}}': `${currency} ${Number(createdOrder.total_shipping_tax_incl).toFixed(2)}`,
                '{{codFee}}': `${currency} ${Number(createdOrder.cod_fee).toFixed(2)}`,
                '{{total}}': `${currency} ${Number(createdOrder.total_paid_tax_incl).toFixed(2)}`,
                '{{COFESupportEmail}}': cofeSupportEmail,
                '{{COFESupportPhone}}': cofeSupportPhone,
                '{{year}}': year,
            }

            let params = {
                subject: 'Your order has been delivered!',
                html: translate('templates', `order-delivered-customer.${emailLanguage}.html`, replacements),
                receivers: [ customer.email ]
            }

            mailsToSend.push(this.sendMail(params))

        }

        Promise.all(mailsToSend)
    }

    model.getEmailPayloadForCallbacks = async function getEmailPayloadForCallbacks(rawData) {

        const { referenceOrderId, orderProducts, updatedOrder, orderPayment } = rawData

        let locale = Object.keys(languages).find(key => languages[key] === updatedOrder.id_lang)

        for (const product of orderProducts) {
            const item = await this.productDetail({ idProduct: product.idProduct, idProductAttribute: product.idProductAttribute || default_uuid }, { countryIso: updatedOrder.marketplace, locale: locale || 'en' }, true, true)
            product.product = item
        }

        let customer = await this.getCustomerDetails(updatedOrder.id_customer)

        if (customer && customer.length) {
            customer = customer[0]

            customer = {
                first_name: customer.firstName,
                last_name: customer.lastName,
                phone_number: customer.phoneNumber,
                email: customer.email,
            }
        }

        const address = await this.getAddress(updatedOrder.id_address_delivery);

        let paymentMethod = orderPayment.payment_method

        if (orderPayment.transaction_id) {
            const cardBrand = orderPayment.card_brand ? `(${orderPayment.card_brand})` : ''
            paymentMethod = `${orderPayment.payment_method} - xxxx xxxx xxxx ${orderPayment.card_number} ${cardBrand}`
        }

        return {
            customer,
            createdOrder: {
                id: referenceOrderId,
                reference: updatedOrder.reference,
                total_products_tax_incl: updatedOrder.total_products_tax_incl,
                total_paid_tax_incl: updatedOrder.total_paid_tax_incl,
                total_shipping_tax_incl: updatedOrder.total_shipping_tax_incl,
                total_discounts_tax_incl: updatedOrder.total_discounts_tax_incl,
                marketplace: updatedOrder.marketplace,
                id_carrier: updatedOrder.id_carrier,
                cod_fee: updatedOrder.cod_fee
            },
            address,
            cartItems: orderProducts,
            paymentMethod,
            id_lang: updatedOrder.id_lang,
        }
    }

    model.sendMail = async function sendMail(params) {

        Aws.config.update({
            accessKeyId: sesKeys.accessKeyId,
            secretAccessKey: sesKeys.secretAccessKey,
            region: sesKeys.region,
        });

        const ses = new Aws.SES({ apiVersion: '2010-12-01' })

        const Charset = 'UTF-8'

        const Subject =  {
            Charset,
            Data: params.subject
        }

        const Html = {
            Charset,
            Data: params.html
        }

        const payload = {
            Destination: {
                ToAddresses: params.receivers
            },
            Message: {
                Body: {
                    Html,
                },
                Subject,
            },
            ReturnPath: orderNotificationEmailSender,
            Source: orderNotificationEmailSender,
        }

        ses.sendEmail(payload, (err, data) => {
            if (err) {
                return console.log(err,'err');
            } else {
                console.log("Email sent to", params.receivers , data);
            }
        })

    }

    model.customerOrdersCount = async function customerOrdersCount(filters, i8ln) {

        const { id_customer } = filters;

        const { countryIso } = i8ln;

        let result = await link
            .from('orders as o')
            .where({ 'id_customer': id_customer, 'marketplace': countryIso, 'is_valid': true })
            .count().first();

        let response = { totalOrders: result.count };

        return { data: response }
    }

    model.tabbyPaymentCallback = async function tabbyPaymentCallback(body) {

        const { tabbyPaymentId, orderId } = body;

        const result = { redirect: "", orderId: orderId, paymentMethod: 'TABBY' };

        const validatePayment = await httpRequest.send({
            path: `${tabbyUrl}/${tabbyPaymentId}`,
            method: 'GET',
            headers: { 'Authorization': `Bearer ${tabbySecretKey}` },
            json: true
        });

        if (validatePayment && validatePayment.id) {

            let capturedData = { "id": validatePayment.id, "amount" : validatePayment.amount }

            const capturePayment = await httpRequest.send({
                path: `${tabbyUrl}/${tabbyPaymentId}/captures`,
                method: 'POST',
                params: capturedData,
                headers: { 'Authorization': `Bearer ${tabbySecretKey}` },
                json: true
            });

            if (capturePayment && capturePayment.id) {

                let currentState = await link.from('order_states').where('name', 'Process In Progress').first('id')

                const [updatedOrder] = await link('orders')
                    .update({ current_state: currentState.id, payment_status: capturePayment.status, is_valid: true })
                    .where({ id: orderId })
                    .returning('*')

                const [orderPayment] = await link('order_payment')
                    .where({ id_order: orderId })
                    .returning('*')
    
                let creditsUsed = parseFloat(orderPayment.credit_used);
    
                if (creditsUsed > 0) {
    
                    let checkoutPayload = {
                        payment: {
                            paymentType: 'CREDIT', paymentScheme: 'CREDIT',
                            isoCurrencyCode: orderPayment.currency, isoCountryCode: updatedOrder.marketplace
                        }, metadata: {
                            language: 'en', orderSource: 'Mobile', creditsUsed,
                            referenceOrderId: orderId,
                            externalCustomerId: updatedOrder.id_customer, internalCustomerId: updatedOrder.cofe_customer_id,
                            customerPhoneNumber: updatedOrder.cofe_customer_phone
                        }
                    }
    
                    this.checkoutPayment(checkoutPayload).then((r) => { console.log('Wallet Deduction'); });
                }
    
                result.redirect = 'cofeecom://redirect';
    
                 // invalidate Cart
                await this.invalidateCart(updatedOrder.id_cart);
    
                const orderProducts = await link.from('order_details')
                    .select('id_product as idProduct', 'id_product_attribute as idProductAttribute',
                        'product_quantity as quantity', 'id_supplier')
                    .where('id_order', orderId)
    
                // Update Products Current Stock
                await this.updateProductsStock(orderProducts);
    
                const notification = {
                    "heading" : {
                        "en": i18n.getCatalog('en').order_successful,
                        "ar" : i18n.getCatalog('ar').order_successful
                    },
                    "message" : {
                        "en": i18n.getCatalog('en').order_success_desc,
                        "ar": i18n.getCatalog('ar').order_success_desc
                    }
                }
    
                const data = { "deeplink" : `${deepLink}order?id=${orderId}`, orderId }
    
                this.sendPushNotification(orderId, updatedOrder.cofe_customer_id, MARKETPLACE_ORDER_DETAIL, notification, data).then((r) => {
                    console.log('Notified To Customer');
                });
    
                let currentDate = moment(updatedOrder.created_at).format('YYYY-MM-DD');
    
                const slackData = { 'OrderId': orderId, 'Reference': updatedOrder.reference, 'PaymentMethod': orderPayment.payment_method,
                    'TotalAmount': parseFloat(updatedOrder.total_paid_tax_incl), 'Marketplace': updatedOrder.marketplace,
                    'orderDate': currentDate
                }
    
                this.sendOrderSlackNotification(slackData).then((r) => { console.log('Notified To Operations'); });
    
                if (supplierSMS) {
    
                    const smsData = { 'Reference': updatedOrder.reference, orderId, 'Marketplace': updatedOrder.marketplace, 'orderItems': orderProducts }
    
                    this.sendOrderSmsNotification(smsData).then((r) => {
                        console.log('Notified To Suppliers');
                    });
                }
    
                emailsPayload = await this.getEmailPayloadForCallbacks({ orderId, orderProducts, updatedOrder, orderPayment })
              
                this.sendOrderEmails(emailsPayload).then((r) => { console.log('Order Confirmation Email sent.'); });

                this.generateTaxInvoice(orderId).then((r) => { console.log('Tax Invoice Generated'); });

            } else {
                result.redirect = 'cofeecom://failure';
            }

        } else {
            result.redirect = 'cofeecom://failure';
        }

        return { data: result }
    }

    model.couponUsage = async function couponUsage({ id_cart_rule, id_customer }) {

        let response = { usage: 0 }

        let _link = link
            .from('order_cart_rule as ocr ')
            .where('ocr.id_cart_rule', id_cart_rule)
            .innerJoin('orders as o', 'o.id', 'ocr.id_order')
            .count()
            .first()

        if (id_customer) {
            _link = _link.where('o.id_customer', id_customer)
        }

        _link = await _link

        response.usage = _link.count

        return { data: response }
    }

    return model;
}
