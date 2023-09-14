exports.up = knex =>
  knex.schema.alterTable('order_revenues', table => {
    table
      .string('brand_subscription_model_id')
      .references('id')
      .inTable('brand_subscription_model')
      .index()
      .notNullable();
    table.specificType('order_total', 'numeric(13, 3)').default(0.0);
    table.specificType('order_subtotal', 'numeric(13, 3)').default(0.0);
    table
      .specificType('delivery_fee_paid_by_customer', 'numeric(13, 3)')
      .default(0.0);
    table
      .specificType('delivery_fee_paid_by_cofe', 'numeric(13, 3)')
      .default(0.0);
    table
      .specificType('delivery_fee_paid_by_vendor', 'numeric(13, 3)')
      .default(0.0);
    table.specificType('country_delivery_fee', 'numeric(13, 3)').default(0.0);

    table.specificType('coupon_amount', 'numeric(13, 3)').default(0.0);
    table
      .specificType('coupon_percentage_by_cofe', 'numeric(13, 3)')
      .default(0.0);
    table
      .specificType('coupon_percentage_by_vendor', 'numeric(13, 3)')
      .default(0.0);
    table.specificType('reward_amount_by_cofe', 'numeric(13, 3)').default(0.0);
    table.specificType('gift_card_amount', 'numeric(13, 3)').default(0.0);
    table
      .specificType('gift_card_percentage_by_cofe', 'numeric(13, 3)')
      .default(0.0);
    table
      .specificType('gift_card_percentage_by_vendor', 'numeric(13, 3)')
      .default(0.0);
    table.specificType('credits', 'numeric(13, 3)').default(0.0);
    table.specificType('referral_credits', 'numeric(13, 3)').default(0.0);
    table.specificType('cashback_credits', 'numeric(13, 3)').default(0.0);
    table.specificType('discovery_credits', 'numeric(13, 3)').default(0.0);
    table.specificType('refunded_by_cofe', 'numeric(13, 3)').default(0.0);
    table.specificType('refunded_by_vendor', 'numeric(13, 3)').default(0.0);
    table.specificType('paid_with_cash', 'numeric(13, 3)').default(0.0);
  });

exports.down = knex =>
  knex.schema.alterTable('order_revenues', table => {
    table.dropColumn('total');
    table.dropColumn('subtotal');
    table.dropColumn('delivery_fee_paid_by_customer');
    table.dropColumn('delivery_fee_paid_by_cofe');
    table.dropColumn('delivery_fee_paid_by_vendor');
    table.dropColumn('country_delivery_fee');
    table.dropColumn('coupon_amount');
    table.dropColumn('coupon_percentage_by_cofe');
    table.dropColumn('coupon_percentage_by_vendor');
    table.dropColumn('reward_amount_by_cofe');
    table.dropColumn('gift_card_amount');
    table.dropColumn('gift_card_percentage_by_cofe');
    table.dropColumn('gift_card_percentage_by_vendor');
    table.dropColumn('referral_credits');
    table.dropColumn('cashback_credits');
    table.dropColumn('discovery_credits');
    table.dropColumn('refunded_by_cofe');
    table.dropColumn('refunded_by_vendor');
    table.dropColumn('paid_with_cash');
  });
