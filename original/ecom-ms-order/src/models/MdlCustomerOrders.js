module.exports = function MdlOrders(opts) {

    const { config, baseModel, mdlOrders } = opts;

    const model = baseModel('orders');

    const { link } = model;

    const { failureStateIds } = config;

    model.customerOrdersForTabby = async function customerOrdersForTabby(i8ln) {

        const response = { data : null }

        const { cofeCustomerToken, countryIso } = i8ln;

        const customer = await mdlOrders.autheticateCustomer(cofeCustomerToken);

        if (!customer.data)
            return customer;

        const { id } = customer.data;

        let orders = await link
        .select(
            'o.id as id',
            'o.reference as reference',
            'o.created_at as orderDate',
            'o.total_paid_tax_incl as totalPaidTaxIncl',
            'os.name as orderStatus'
        )
        .from('orders as o')
        .where('o.id_customer', id)
        .whereILike('o.marketplace', countryIso)
        .innerJoin('order_states as os', 'o.current_state', 'os.id')
        .orderBy('o.created_at', 'desc')
        .whereNotIn('current_state', failureStateIds).limit(3)

        if (orders?.length) {

            for (let order of orders) {

                 if (order.orderStatus === 'Process In Progress') {
                    order.orderStatus = 'new';
                 } else if (order.orderStatus === 'Delivered') {
                    order.orderStatus = 'complete';
                 } else if (order.orderStatus === 'Cancelled') {
                    order.orderStatus = 'canceled'
                 } else if (order.orderStatus === 'Refund') {
                    order.orderStatus = 'refunded';
                 } else {
                    order.orderStatus = 'processing';
                 }

            }
        }

        response.data = orders;

        return response;
    }

    return model;
}
