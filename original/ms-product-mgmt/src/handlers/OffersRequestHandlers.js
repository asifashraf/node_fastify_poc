module.exports = function OffersRequestHandlers(opts) {

    const { crudBaseHandler } = opts;

    const handler = crudBaseHandler([
        'svcOffers',
    ], 'offers');

    const {
        svcOffers
    } = handler.di;

    handler.fetch = async function (req, reply) {

        const { body, pagination, i8ln } = req;

        const { filters } = body;

        const offers = await svcOffers.getAllOffers({ filters, pagination, i8ln });

        reply.send( offers );
    }

    handler.save = async function (req, reply) {

        const { body } = req;

        const { offer } = body;

        const offers = await svcOffers.createOffer({ offer });

        reply.send( offers );
    }

    handler.update = async function (req, reply) {

        const { body } = req;

        const { offer } = body;

        const offers = await svcOffers.updateOffer({ offer });

        reply.send( offers );
    }

    handler.delete = async function (req, reply) {

        const { body } = req;

        const { id } = body;

        const offers = await svcOffers.deleteOffer({ id });

        reply.send( offers );
    }

    handler.view = async function (req, reply) {

        const { params } = req;

        const { id } = params

        const offers = await svcOffers.view({ id });

        reply.send( offers );
    }

    handler.getoffersWithMaxDiscount = async function (req, reply) {

        const { i8ln } = req;

        const offers = await svcOffers.offersWithMaxDiscount({ i8ln });

        reply.send( offers );
    }


    return handler;
}
