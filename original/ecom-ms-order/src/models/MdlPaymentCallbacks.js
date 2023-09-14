module.exports = function mdlPaymentCallbacks(opts) {

    const { config, baseModel, httpRequest, mdlOrders } = opts;

    const model = baseModel('orders');

    const { tabbyUrl, tabbySecretKey } = config;

    model.tabbyCallbackCron = async function tabbyCallbackCron(body) {

        const response = { data: null };

        const tabbyPayments = await httpRequest.send({
            path: `${tabbyUrl}?limit=3`,
            method: 'GET',
            headers: { 'Authorization': `Bearer ${tabbySecretKey}` },
            json: true
        });

        if (tabbyPayments.payments && tabbyPayments.payments.length > 0) {

            for (let payment of tabbyPayments.payments) {

                if (payment.status === 'AUTHORIZED') {
                    
                    let orderId = payment.order.reference_id;
                    let tabbyPaymentId = payment.id;

                    let requestData = { tabbyPaymentId, orderId }

                    mdlOrders.tabbyPaymentCallback(requestData)
                }
            }
        } 

        return response
    }

    return model;
}