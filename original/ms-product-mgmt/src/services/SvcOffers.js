module.exports = function SvcOffers(opts) {

    const { Boom, logger, mdlOffers, i18n } = opts;

    const getAllOffers = async ({ filters, pagination, i8ln }) => {
        try {

            const offers = await mdlOffers.getAll( filters, pagination, i8ln );

            return offers;

        } catch (ex) {
            logger.error({ msg: 'SvcOffers > getAllOffers > error >', ex });
            throw Boom.notFound(`Error while fetching offers: ${ex.message}`, ex);
        }
    }

    const createOffer = async ({ offer }) => {
        try {

            const offers = await mdlOffers.createOffer(offer);
            return offers;

        } catch (ex) {
            logger.error({ msg: 'SvcOffers > createOffer > error >', ex });
            throw Boom.notFound(`Error while creating offer: ${ex.message}`, ex);
        }
    }

    const updateOffer = async ({ offer }) => {
        try {

            const offers = await mdlOffers.updateOffer(offer);
            return offers;

        } catch (ex) {
            logger.error({ msg: 'SvcOffers > updateOffer > error >', ex });
            throw Boom.notFound(`Error while updating offer: ${ex.message}`, ex);
        }
    }

    const deleteOffer = async ({id}) => {
        try {

            const offer = await mdlOffers.deleteOffer(id);
            return offer;

        } catch (ex) {
            logger.error({ msg: 'SvcOffers > deleteOffer > error >', ex });
            throw Boom.notFound(`Error while deleting offer: ${ex.message}`, ex);
        }
    }

    const view = async ({id}) => {
        try {

            const offer = await mdlOffers.view(id);
            return offer;

        } catch (ex) {
            logger.error({ msg: 'SvcOffers > viewOffer > error >', ex });
            throw Boom.notFound(`Error while view offer: ${ex.message}`, ex);
        }
    }

    const offersWithMaxDiscount = async ({ i8ln }) => {
        try {

            const offers = await mdlOffers.offersWithMaxDiscount( i8ln );

            return offers;

        } catch (ex) {
            logger.error({ msg: 'SvcOffers > getAllOffers > error >', ex });
            throw Boom.notFound(`Error while fetching offers: ${ex.message}`, ex);
        }
    }

    return {
        getAllOffers,
        createOffer,
        deleteOffer,
        updateOffer,
        view,
        offersWithMaxDiscount
    }

}
