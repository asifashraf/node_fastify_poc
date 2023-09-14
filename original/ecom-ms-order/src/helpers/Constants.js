module.exports = function () {
    return {
        UNKNOWN_ERROR: 'Unknown server error, please contact the administrator',
        MARKETPLACE_ORDER_DETAIL: 'MARKETPLACE_ORDER_DETAIL',
        API_URLS: {
            GET_CART: '/cart',
            GET_CART_RULE: '/get-cart-rule',
            AUTHENTICATE: '/authenticate',
            COUNTRIES: '/countries',
            ADDRESS: '/address',
            BULK_ADDRESS: '/bulk-address',
            UPDATE_CART: '/update-cart',
            UPDATE_PRODUCT_STOCK: '/update-product-stock',
            PRODUCT_DETAIL: '/product/',
            GET_CART_CARRIERS: '/get-cart-carriers',
            CARRIERS: '/carriers',
            CARRIER_PARTNERS: '/carrier-partners',
            GET_CUSTOMER_DETAILS: '/get-customer',
            GET_SUPPLIER_AND_PRODUCT_DETAILS: '/get-supplier-and-product-details',
            UPLOAD: '/upload',
            GET_SUPPLIER_DETAILS: '/supplier/',
            CHECKOUT_PAY: '/open-authentication/pay',
            CUSTOMER_WALLET: '/customer-wallet',
            SEND_PUSH_NOTIFICATION: '/open-authentication/send-notification',
            SEND_SLACK_NOTIFICATION: '/open-authentication/send-slack-notification',
            BULK_SUPPLIERS: '/bulk-suppliers',
            SEND_SMS_NOTIFICATION: '/open-authentication/send-sms-notification',
            SEND_WHATSAPP_NOTIFICATION_ON_DELIVERY: '/send-whatsapp-notification-on-delivery',
        },

        SUPPLIER_STATUS: {
            SENT_TO_CONSOLIDATION_CENTER: '4f2389de-fb6c-4902-a155-c08641108dd3',
            SHIPPED_TO_CUSTOMER: '4f2389de-fb6c-4902-a155-c08641108dd5',
            DELIVERED: '4f2389de-fb6c-4902-a155-c08641108dd6',
        },

        PRODUCT_STATUS:{
            DELIVERED: '8def874c-bfaa-40c1-a192-2161b479623f',
            FULLFILED: "e99c3605-be08-49d2-8f67-0db7d10beac9"
        }
	}
};
