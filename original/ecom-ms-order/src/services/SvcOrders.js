module.exports = function SvcOrders(opts) {

    const { Boom, logger, mdlOrders, mdlCustomerOrders } = opts;

    const placeOrder = async ({ order, i8ln }) => {
        try {

            const orders = await mdlOrders.placeOrder(order, i8ln);
            return orders;

        } catch (ex) {
            logger.error({ msg: 'SvcOrdersjs > placeOrder > error >', ex });
            throw Boom.forbidden(`${ex.message}`, ex);
        }
    }

    const orderDetail = async ({ params, i8ln }) => {
        try {

            const order = await mdlOrders.customerOrderDetail(params, i8ln);
            return order;

        } catch (ex) {
            logger.error({ msg: 'SvcOrdersjs > orderDetail > error >', ex });
            throw Boom.notFound(`Error while getting order details: ${ex.message}`, ex);
        }
    }

    const orderShipments = async ({ params, i8ln }) => {
        try {

            const order = await mdlOrders.orderShipments(params, i8ln);
            return order;

        } catch (ex) {
            logger.error({ msg: 'SvcOrdersjs > orderShipments > error >', ex });
            throw Boom.notFound(`Error while getting order shipments: ${ex.message}`, ex);
        }
    }

    const customerOrders = async ({ i8ln, pagination }) => {
        try {

            const orders = await mdlOrders.customerOrders(i8ln, pagination);
            return orders;

        } catch (ex) {
            logger.error({ msg: 'SvcOrdersjs > customer Orders > error >', ex });
            throw Boom.notFound(`Error while getting orders: ${ex.message}`, ex);
        }
    }

    const customerOrdersForTabby = async ({ i8ln }) => {
        try {

            const orders = await mdlCustomerOrders.customerOrdersForTabby(i8ln);
            return orders;

        } catch (ex) {
            logger.error({ msg: 'SvcOrdersjs > customer Orders For Tabby > error >', ex });
            throw Boom.notFound(`Error while getting orders: ${ex.message}`, ex);
        }
    }

    const customerOrdersCount = async ({ filters, i8ln }) => {
        try {

            const ordersCount = await mdlOrders.customerOrdersCount(filters, i8ln);
            return ordersCount;

        } catch (ex) {
            logger.error({ msg: 'SvcOrdersjs > customer Orders Count > error >', ex });
            throw Boom.notFound(`Error while getting orders count: ${ex.message}`, ex);
        }
    }

    const couponUsage = async ({ body }) => {
        try {

            const usage = await mdlOrders.couponUsage(body);
            return usage;

        } catch (ex) {
            logger.error({ msg: 'SvcOrdersjs > coupon usage > error >', ex });
            throw Boom.notFound(`Error while getting coupon usage: ${ex.message}`, ex);
        }
    }

    const viewOrderDetails = async ({ params, query, i8ln }) => {
        try {

            const order = await mdlOrders.viewOrderDetails({ params, query, i8ln });
            return order;

        } catch (ex) {
            logger.error({ msg: 'SvcOrdersjs > viewOrderDetails > error >', ex });
            throw Boom.notFound(`Error while viewing order details: ${ex.message}`, ex);
        }
    }


    const getAllOrders = async ({ filters, pagination, i8ln }) => {
        try {

            const order = await mdlOrders.getAllOrders({ filters, pagination, i8ln });
            return order;

        } catch (ex) {
            logger.error({ msg: 'SvcOrdersjs > getAllOrders > error >', ex });
            throw Boom.notFound(`Error while fetching orders: ${ex.message}`, ex);
        }
    }

    const getAllProductStatus = async () => {
        try {

            const statuses = await mdlOrders.getAllProductStatus();
            return statuses;

        } catch (ex) {
            logger.error({ msg: 'SvcOrdersjs > getAllProductStatus > error >', ex });
            throw Boom.notFound(`Error while fetching product statuses: ${ex.message}`, ex);
        }
    }

    const getAllOrderStatus = async () => {
        try {

            const statuses = await mdlOrders.getAllOrderStatus();
            return statuses;

        } catch (ex) {
            logger.error({ msg: 'SvcOrdersjs > getAllOrderStatus > error >', ex });
            throw Boom.notFound(`Error while fetching order statuses: ${ex.message}`, ex);
        }
    }

    const orderStatusUpdate = async (order) => {
        try {

            const statuses = await mdlOrders.orderStatusUpdate(order);
            return statuses;

        } catch (ex) {
            logger.error({ msg: 'SvcOrdersjs > orderStatusUpdate > error >', ex });
            throw Boom.notFound(`Error while updating order status: ${ex.message}`, ex);
        }
    }

    const orderProductStatusUpdate = async (order) => {
        try {

            const statuses = await mdlOrders.orderProductStatusUpdate(order);
            return statuses;

        } catch (ex) {
            logger.error({ msg: 'SvcOrdersjs > orderProductStatusUpdate > error >', ex });
            throw Boom.notFound(`Error while updating order product status: ${ex.message}`, ex);
        }
    }

    const paymentWebHook = async ({ body }) => {
        try {

            const payment = await mdlOrders.paymentWebHook({ body });
            return payment;

        } catch (ex) {
            logger.error({ msg: 'SvcOrdersjs > paymentCallBack > error >', ex });
            throw Boom.notFound(`Error while paymentCallback: ${ex.message}`, ex);
        }
    }

    const paymentMfCallBack = async ({ body }) => {
        try {

            const payment = await mdlOrders.paymentMfCallBack({ body });
            return payment;

        } catch (ex) {
            logger.error({ msg: 'SvcOrdersjs > paymentCallBack > error >', ex });
            throw Boom.notFound(`Error while paymentCallback: ${ex.message}`, ex);
        }
    }

    const paymentTapCallBack = async ({ body }) => {
        try {

            const payment = await mdlOrders.paymentTapCallBack({ body });
            return payment;

        } catch (ex) {
            logger.error({ msg: 'SvcOrdersjs > paymentCallBack > error >', ex });
            throw Boom.notFound(`Error while paymentCallback: ${ex.message}`, ex);
        }
    }

    const tabbyPaymentCallback = async ({ body }) => {
        try {

            const payment = await mdlOrders.tabbyPaymentCallback( body );
            return payment;

        } catch (ex) {
            logger.error({ msg: 'SvcOrdersjs > tabbyPaymentCallback > error >', ex });
            throw Boom.notFound(`Error while tabbyPaymentCallback: ${ex.message}`, ex);
        }
    }

    const paymentCallBack = async ({ body }) => {
        try {

            const payment = await mdlOrders.paymentCallBack( body );
            return payment;

        } catch (ex) {
            logger.error({ msg: 'SvcOrdersjs > paymentCallBack > error >', ex });
            throw Boom.notFound(`Error while paymentCallback: ${ex.message}`, ex);
        }
    }

    const updateOrder = async ({ order, i8ln }) => {
        try {

            const _order = await mdlOrders.updateOrder(order, i8ln);
            return _order;

        } catch (ex) {
            logger.error({ msg: 'SvcOrdersjs > updateOrder > error >', ex });
            throw Boom.forbidden(`${ex.message}`, ex);
        }
    }

    return {
        placeOrder,
        orderDetail,
        customerOrders,
        viewOrderDetails,
        getAllOrders,
        paymentWebHook,
        paymentTapCallBack,
        paymentMfCallBack,
        paymentCallBack,
        getAllProductStatus,
        orderStatusUpdate,
        orderProductStatusUpdate,
        getAllOrderStatus,
        updateOrder,
        customerOrdersCount,
        couponUsage,
        orderShipments,
        customerOrdersForTabby,
        tabbyPaymentCallback
    }
}
