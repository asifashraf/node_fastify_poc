module.exports = function SvcExports(opts) {

    const { Boom, logger, mdlExports } = opts;

    const exportAllOrders = async ({ filters, pagination, i8ln, user, timezone }) => {
        try {

            const order = await mdlExports.exportAllOrders({ filters, pagination, i8ln, user, timezone });
            return order;

        } catch (ex) {
            logger.error({ msg: 'SvcExports > exportAllOrders > error >', ex });
            throw Boom.notFound(`Error while exporting orders: ${ex.message}`, ex);
        }
    }

    return {
        exportAllOrders,
    }
}
