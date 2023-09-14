module.exports = function () {
    return {
        default_vat: 5,
        default_currency: 'AED',
        UNKNOWN_ERROR: 'Unknown server error, please contact the administrator',
        API_URLS: {
            COUNTRIES: '/countries',
            AUTHENTICATE: '/authenticate',
            REMOVE_CART_ITEM: '/remove-from-all-carts',
            ADD_USER: '/add-user',
            CHECK_PAYMENT_OPTION: '/check-payment-option',
            CALCULATE_ETA: '/calculate-eta'
        }
	}
};
