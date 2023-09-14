module.exports = function OfferRequestSchema(opts) {

    const { baseRequestSchema, offerRequestParameters } = opts;

    const routeInfo = {
        save: {
            url: '/add-offer',
            method: 'POST',
            schema: {
                body: offerRequestParameters.createOfferRequestBody()
            }
        },
        fetch: {
            url: '/offers',
            method: 'POST',
            schema: {
                body: offerRequestParameters.getAllOffersRequestBody(),
            }
        },
        update: {
            url: '/update-offer',
            method: 'POST',
            schema: {
                body: offerRequestParameters.updateOfferRequestBody(),
            }
        },
        view: {
            url: '/offer/:id',
            method: 'GET',
            schema : {
                params: offerRequestParameters.viewOfferRequestBody()
            }
        },
        delete: {
            url: '/delete-offer',
            method: 'POST',
            schema : {
                body: offerRequestParameters.deleteOfferRequestBody()
            }
        },
        getoffersWithMaxDiscount: {
            url: '/quick-offers',
            method: 'GET'
        }
    };

    const schema = baseRequestSchema('offersRequestHandlers', routeInfo)

    return schema;
}
