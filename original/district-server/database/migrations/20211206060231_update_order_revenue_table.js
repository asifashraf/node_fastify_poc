
exports.up = function(knex) {
    return knex.schema.table('order_revenues', table => {
        table.renameColumn('country_delivery_fee', 'brand_delivery_fee');
        table.renameColumn('coupon_percentage_by_cofe', 'coupon_paid_by_cofe');
        table.renameColumn('coupon_percentage_by_vendor', 'coupon_paid_by_vendor');
        table.renameColumn('gift_card_percentage_by_cofe', 'gift_card_paid_by_cofe');
        table.renameColumn('gift_card_percentage_by_vendor', 'gift_card_paid_by_vendor');
        table.specificType('amount_paid_payment_provider', 'numeric(13, 3)').default(0.0);

    })
};

exports.down = function(knex) {
    return knex.schema.table('order_revenues', table => {
        table.renameColumn('brand_delivery_fee', 'country_delivery_fee');
        table.renameColumn('coupon_paid_by_cofe', 'coupon_percentage_by_cofe');
        table.renameColumn('coupon_paid_by_vendor', 'coupon_percentage_by_vendor');
        table.renameColumn('gift_card_paid_by_cofe', 'gift_card_percentage_by_cofe');
        table.renameColumn('gift_card_paid_by_vendor', 'gift_card_percentage_by_vendor');
        table.dropColumn('amount_paid_payment_provider');
    })
};
