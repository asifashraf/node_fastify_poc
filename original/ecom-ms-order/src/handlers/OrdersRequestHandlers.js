module.exports = function OrdersRequestHandlers(opts) {

    const { crudBaseHandler } = opts;

    const handler = crudBaseHandler([
        'svcOrders',
    ], 'orders');

    const {
        svcOrders
    } = handler.di;

    handler.placeOrder = async function (req, reply) {

        const { body, i8ln } = req;

        const { order } = body;

        const orders = await svcOrders.placeOrder({ order, i8ln });

        reply.send( orders );
    }

    handler.orderDetail = async function (req, reply) {

        const { params, i8ln } = req;

        const order = await svcOrders.orderDetail({ params, i8ln });

        reply.send( order );
    }
    
    handler.orderShipments = async function (req, reply) {

        const { params, i8ln } = req;

        const order = await svcOrders.orderShipments({ params, i8ln });

        reply.send( order );
    }

    handler.viewOrderDetails = async function (req, reply) {

        const { params, query, i8ln } = req;

        const order = await svcOrders.viewOrderDetails({ params, query, i8ln });

        reply.send( order );
    }

    handler.customerOrders = async function (req, reply) {

        const { i8ln, pagination } = req;

        const orders = await svcOrders.customerOrders({ i8ln, pagination });

        reply.send( orders );
    }

    handler.customerOrdersForTabby = async function (req, reply) {

        const { i8ln } = req;

        const orders = await svcOrders.customerOrdersForTabby({ i8ln });

        reply.send( orders );
    }

    handler.getAllOrders = async function (req, reply) {

        const { body, pagination, i8ln } = req;

        const { filters } = body

        const order = await svcOrders.getAllOrders({ filters, pagination, i8ln });

        reply.send( order );
    }

    handler.getAllProductStatus = async function (req, reply) {

        const statuses = await svcOrders.getAllProductStatus();

        reply.send( statuses );
    }

    handler.getAllOrderStatus = async function (req, reply) {

        const statuses = await svcOrders.getAllOrderStatus();

        reply.send( statuses );
    }

    handler.orderStatusUpdate = async function (req, reply) {

        const { body } = req;

        const { order } = body

        const status = await svcOrders.orderStatusUpdate(order);

        reply.send( status );
    }

    handler.orderProductStatusUpdate = async function (req, reply) {

        const { body } = req;

        const { order } = body

        const status = await svcOrders.orderProductStatusUpdate(order);

        reply.send( status );
    }

    handler.paymentCallBack = async function (req, reply) {

        const { body } = req;

        const payment = await svcOrders.paymentCallBack({ body });

        reply.send( payment );
    }

    handler.tabbyPaymentCallback = async function (req, reply) {

        const { body } = req;

        const payment = await svcOrders.tabbyPaymentCallback({ body });

        reply.send( payment );
    }

    handler.paymentWebHook = async function (req, reply) {

        const { body } = req;

        const payment = await svcOrders.paymentWebHook({ body });

        reply.send( payment );
    }

    handler.paymentMfCallBack = async function (req, reply) {

        const { body } = req;

        const payment = await svcOrders.paymentMfCallBack({ body });

        reply.send( payment );
    }

    handler.paymentTapCallBack = async function (req, reply) {

        const { body } = req;

        const payment = await svcOrders.paymentTapCallBack({ body });

        reply.send( payment );
    }

    handler.customerOrdersCount = async function (req, reply) {

        const { body, i8ln } = req;

        const { filters } = body;

        const ordersCount = await svcOrders.customerOrdersCount({ filters, i8ln });

        reply.send( ordersCount );
    }

    handler.couponUsage = async function (req, reply) {

        const { body } = req;

        const usage = await svcOrders.couponUsage({ body });

        reply.send( usage );
    }

    handler.updateOrder = async function (req, reply) {

        const { body, i8ln } = req;

        const { order } = body;

        const orders = await svcOrders.updateOrder({ order, i8ln });

        reply.send( orders );
    }

    return handler;
}
