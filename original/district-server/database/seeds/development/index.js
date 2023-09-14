const knexCleaner = require('knex-cleaner');
const casual = require('casual');
const knex = require('../../index');
const { skipSeedTestOrders } = require('../../../config');
const { resetTable } = require('../utils');

// Re-seeding casual in between each object generation should help minimize the impact
// seeds have on each other when they are updated
let casualSeed = 1;
casual.seed(casualSeed++);
const customers = require('../objects/customers')();
casual.seed(casualSeed++);
const authCustomers = require('../objects/auth-customers')(customers);
casual.seed(casualSeed++);
const brands = require('../objects/brands')();
casual.seed(casualSeed++);
const neighborhoods = require('../objects/neighborhoods')();
casual.seed(casualSeed++);
const brandLocations = require('../objects/brand-locations')(brands);
casual.seed(casualSeed++);
const brandLocationAdmins = require('../objects/brand-location-admins')(
  brandLocations
);
casual.seed(casualSeed++);
const brandLocationAddresses = require('../objects/brand-location-addresses')(
  brandLocations,
  knex
);
casual.seed(casualSeed++);
const brandLocationsNeighborhoods = require('../objects/brand-locations-neighborhoods')(
  brandLocations,
  neighborhoods
);
casual.seed(casualSeed++);
const coupons = require('../objects/coupons')();
casual.seed(casualSeed++);
const nutritionalInfo = require('../objects/nutritional-info')();
casual.seed(casualSeed++);
const menus = require('../objects/menus')(brands);
casual.seed(casualSeed++);
const menuSections = require('../objects/menu-sections')(menus);
casual.seed(casualSeed++);
const menuItems = require('../objects/menu-items')(
  menuSections,
  nutritionalInfo
);
casual.seed(casualSeed++);
const orderSets = skipSeedTestOrders
  ? []
  : require('../objects/order-sets')(customers, brandLocations, coupons);
casual.seed(casualSeed++);
const menuItemOptionSets = require('../objects/menu-item-option-sets')(
  menuItems
);
casual.seed(casualSeed++);
const menuItemOptions = require('../objects/menu-item-options')(
  menuItemOptionSets
);
casual.seed(casualSeed++);
const orderFulfillments = require('../objects/order-fulfillment')(orderSets);
casual.seed(casualSeed++);
const weeklySchedule = require('../objects/weekly-schedule')(brandLocations);
casual.seed(casualSeed++);
const orderItems = require('../objects/order-items')(menuItems, orderSets);
casual.seed(casualSeed++);
const scheduleExceptions = require('../objects/schedule-exceptions')(
  brandLocations
);
casual.seed(casualSeed++);
const orderItemOptions = require('../objects/order-item-options')(
  menuItemOptions,
  orderItems
);
casual.seed(casualSeed++);
const configuration = require('../objects/configuration')();
casual.seed(casualSeed++);
const brandsCoupons = require('../objects/brands-coupons')(brands, coupons);
const brandsLocationsCoupons = require('../objects/brands-locations-coupons')(
  brandLocations,
  coupons
);
casual.seed(casualSeed++);
const customersCoupons = require('../objects/customers-coupons')(
  customers,
  coupons
);
casual.seed(casualSeed++);
const customerAddresses = require('../objects/customer-addresses')(
  customers,
  neighborhoods,
  knex
);
casual.seed(casualSeed++);
const customerCars = require('../objects/customer-cars')(customers);
casual.seed(casualSeed++);
const unavailableBrandLocationMenuItems = require('../objects/brand-locations-unavailable-menu-items')(
  brandLocations,
  menuItems
);

casual.seed(casualSeed++);
const cofeDistrictWeeklySchedule = require('../objects/cofe-district-weekly-schedule')();

casual.seed(casualSeed++);
const deliveryAddresses = require('../objects/delivery-addresses')(
  orderFulfillments,
  customerAddresses,
  neighborhoods
);

casual.seed(casualSeed++);
const allergens = require('../objects/allergens')();

casual.seed(casualSeed++);
const nutritionalInfoAllergens = require('../objects/nutritional-info-allergens')(
  nutritionalInfo,
  allergens
);
casual.seed(casualSeed++);
const orderSetStatuses = require('../objects/order-set-statuses')(orderSets);
casual.seed(casualSeed++);
const paymentStatuses = require('../objects/payment-statuses')(orderSets);
casual.seed(casualSeed++);
const towers = require('../objects/towers')();
casual.seed(casualSeed++);
const loyaltyOrders = require('../objects/loyalty-orders')(customers);
casual.seed(casualSeed++);
const loyaltyPaymentStatuses = require('../objects/loyalty-payment-statuses')(
  loyaltyOrders
);
casual.seed(casualSeed++);
const loyaltyTransactions = require('../objects/loyalty-transactions')(
  loyaltyOrders
);

if (!skipSeedTestOrders) {
  const orderSetsRealistic = require('../objects/order-sets-realistic')(
    customers,
    customerAddresses,
    neighborhoods,
    brandLocations,
    menuItems,
    menuItemOptions
  );
  orderSets.push(...orderSetsRealistic.orderSets);
  orderItems.push(...orderSetsRealistic.orderItems);
  orderItemOptions.push(...orderSetsRealistic.orderItemOptions);
  paymentStatuses.push(...orderSetsRealistic.paymentStatuses);
  orderSetStatuses.push(...orderSetsRealistic.orderSetStatuses);
  orderFulfillments.push(...orderSetsRealistic.orderFulfillments);
  deliveryAddresses.push(...orderSetsRealistic.deliveryAddresses);
}

// Loyalty Orders use payment status as well
paymentStatuses.push(...loyaltyPaymentStatuses);

casual.seed(casualSeed++);
const notifications = require('../objects/notifications')();
casual.seed(casualSeed++);
const marketingNotifications = require('../objects/marketing-notifications')(
  notifications
);
casual.seed(casualSeed++);
const orderSetComments = require('../objects/order-set-comments')(orderSets);
casual.seed(casualSeed++);
const customerStats = require('../objects/customer-stats')(customers);
casual.seed(casualSeed++);

casual.seed(casualSeed++);
const currencies = require('../objects/currencies')();

casual.seed(casualSeed++);
const countries = require('../objects/countries')();

casual.seed(casualSeed++);
const cities = require('../objects/cities')();

casual.seed(casualSeed++);
const banners = require('../objects/banners')();

casual.seed(casualSeed++);
const goldenCofeBrands = require('../objects/golden-cofe-brands')();

casual.seed(casualSeed++);
const goldenCofeTerms = require('../objects/golden-cofe-terms')();

casual.seed(casualSeed++);
const rewards = require('../objects/rewards')(brands);

casual.seed(casualSeed++);
const rewardTiers = require('../objects/reward-tiers')(rewards);

casual.seed(casualSeed++);
const rewardTierPerks = require('../objects/reward-tier-perks')(rewardTiers);

casual.seed(casualSeed++);
const customerAddressesFields = require('../objects/customer-addresses-fields')();

casual.seed(casualSeed++);
const loyaltyTiers = require('../objects/loyalty-tiers')(countries, currencies);

casual.seed(casualSeed++);
const loyaltyBonuses = require('../objects/loyalty-bonuses')();

casual.seed(casualSeed++);
const admins = require('../objects/admins')();
casual.seed(casualSeed++);
const brandAdmins = require('../objects/brand-admins')(
  brandLocations,
  brandLocationAdmins
);
casual.seed(casualSeed++);
const permissions = require('../objects/permissions')();
casual.seed(casualSeed++);
const groups = require('../objects/groups')();
casual.seed(casualSeed++);
const roles = require('../objects/roles')();
casual.seed(casualSeed++);
const groupRoles = require('../objects/group-roles')(groups, roles);
casual.seed(casualSeed++);
const nestedGroups = require('../objects/nested-groups')(groups);
casual.seed(casualSeed++);
const groupAdmins = require('../objects/group-admins')(groups, admins);
casual.seed(casualSeed++);
const rolePermissions = require('../objects/role-permissions')(
  roles,
  permissions
);
casual.seed(casualSeed++);
const orderComments = require('../objects/order-comments')(orderSets);

casual.seed(casualSeed++);
const customerCardTokens = require('../objects/customer-card-tokens')(
  customers
);

casual.seed(casualSeed++);
const orderPaymentMethods = require('../objects/order-payment-methods')(
  orderSets,
  loyaltyOrders
);
casual.seed(casualSeed++);
const brandsRewards = require('../objects/brands-rewards')(brands, rewards);

casual.seed(casualSeed++);
const couponDetails = require('../objects/coupon-details')(coupons);

casual.seed(casualSeed++);
const giftCardCollections = require('../objects/gift-card-collections')();

casual.seed(casualSeed++);
const giftCardTemplates = require('../objects/gift-card-templates')(
  giftCardCollections,
  brands
);

casual.seed(casualSeed++);
const giftCardOrders = require('../objects/gift-card-orders')(
  giftCardTemplates,
  customers
);

casual.seed(casualSeed++);
const giftCards = require('../objects/gift-cards')(
  giftCardOrders,
  giftCardTemplates,
  customers
);

casual.seed(casualSeed++);
const giftCardTransactions = require('../objects/gift-card-transactions')(
  giftCards,
  customers
);
casual.seed(casualSeed++);
const referrals = require('../objects/referrals')(customers);
casual.seed(casualSeed++);
const categories = require('../objects/categories')();
casual.seed(casualSeed++);
const products = require('../objects/products')(brands);
casual.seed(casualSeed++);
const productsCategories = require('../objects/products-categories')(
  products,
  categories
);
casual.seed(casualSeed++);
const productImages = require('../objects/product-images')(products);
casual.seed(casualSeed++);
const pickupLocations = require('../objects/pickup-locations')(
  brands,
  neighborhoods,
  knex
);
casual.seed(casualSeed++);
const inventories = require('../objects/inventories')(
  pickupLocations,
  products
);
casual.seed(casualSeed++);
const shippingPolicies = require('../objects/shipping-policies')(countries);
casual.seed(casualSeed++);
const returnPolicies = require('../objects/return-policies')(products);

casual.seed(casualSeed++);
const countryConfiguration = require('../objects/country-configuration')(
  countries
);
casual.seed(casualSeed++);
const customerGroups = require('../objects/customer-groups')();
casual.seed(casualSeed++);
const customerGroupsCustomers = require('../objects/customer-groups-customers')(
  customers
);
casual.seed(casualSeed++);
const blogCategories = require('../objects/blog-categories')();
casual.seed(casualSeed++);
const blogPosts = require('../objects/blog-posts')();

function seed() {
  return knexCleaner
    .clean(knex, {
      ignoreTables: ['migrations', 'migrations_lock', 'spatial_ref_sys'],
    })
    .then(() => resetTable('currencies', currencies))
    .then(() => resetTable('countries', countries))
    .then(() => resetTable('cities', cities))
    .then(() => resetTable('towers', towers))
    .then(() => resetTable('coupons', coupons))
    .then(() => resetTable('customers', customers))
    .then(() => resetTable('auth_customer', authCustomers))
    .then(() =>
      resetTable('admins', Object.assign(brandLocationAdmins, admins))
    )
    .then(() => resetTable('brands', brands))
    .then(() => resetTable('permissions', permissions))
    .then(() => resetTable('groups', groups))
    .then(() => resetTable('roles', roles))
    .then(() => resetTable('group_roles', groupRoles))
    .then(() => resetTable('nested_groups', nestedGroups))
    .then(() => resetTable('group_admins', groupAdmins))
    .then(() => resetTable('role_permissions', rolePermissions))
    .then(() => resetTable('neighborhoods', neighborhoods))
    .then(() => resetTable('brand_locations', brandLocations))
    .then(() => resetTable('brand_admins', brandAdmins))
    .then(() => resetTable('brand_location_addresses', brandLocationAddresses))
    .then(() =>
      resetTable('brand_locations_neighborhoods', brandLocationsNeighborhoods)
    )
    .then(() => resetTable('nutritional_info', nutritionalInfo))
    .then(() => resetTable('notifications', notifications))
    .then(() => resetTable('marketing_notifications', marketingNotifications))
    .then(() => resetTable('menus', menus))
    .then(() => resetTable('menu_sections', menuSections))
    .then(() => resetTable('menu_items', menuItems))
    .then(() => resetTable('order_sets', orderSets))
    .then(() => resetTable('menu_item_option_sets', menuItemOptionSets))
    .then(() => resetTable('menu_item_options', menuItemOptions))
    .then(() => resetTable('order_fulfillment', orderFulfillments))
    .then(() => resetTable('weekly_schedules', weeklySchedule))
    .then(() => resetTable('order_items', orderItems))
    .then(() => resetTable('schedule_exceptions', scheduleExceptions))
    .then(() => resetTable('order_item_options', orderItemOptions))
    .then(() => resetTable('configuration', configuration))
    .then(() => resetTable('brands_coupons', brandsCoupons))
    .then(() => resetTable('brand_locations_coupons', brandsLocationsCoupons))
    .then(() => resetTable('customers_coupons', customersCoupons))
    .then(() => resetTable('customer_addresses', customerAddresses))
    .then(() => resetTable('customer_cars', customerCars))
    .then(() => resetTable('allergens', allergens))
    .then(() =>
      resetTable('nutritional_info_allergens', nutritionalInfoAllergens)
    )
    .then(() =>
      resetTable('cofe_district_weekly_schedule', cofeDistrictWeeklySchedule)
    )
    .then(() =>
      resetTable(
        'brand_locations_unavailable_menu_items',
        unavailableBrandLocationMenuItems
      )
    )
    .then(() => resetTable('delivery_addresses', deliveryAddresses))
    .then(() => resetTable('order_set_statuses', orderSetStatuses))
    .then(() => resetTable('payment_statuses', paymentStatuses))
    .then(() => resetTable('loyalty_tiers', loyaltyTiers))
    .then(() => resetTable('loyalty_bonuses', loyaltyBonuses))
    .then(() => resetTable('loyalty_orders', loyaltyOrders))
    .then(() => resetTable('loyalty_transactions', loyaltyTransactions))
    .then(() => resetTable('order_set_comments', orderSetComments))
    .then(() => resetTable('customer_stats', customerStats))
    .then(() => resetTable('banners', banners))
    .then(() => resetTable('golden_cofe_brands', goldenCofeBrands))
    .then(() => resetTable('golden_cofe_terms', goldenCofeTerms))
    .then(() => resetTable('rewards', rewards))
    .then(() => resetTable('reward_tiers', rewardTiers))
    .then(() => resetTable('reward_tier_perks', rewardTierPerks))
    .then(() =>
      resetTable('customer_addresses_fields', customerAddressesFields)
    )
    .then(() => resetTable('order_comments', orderComments))
    .then(() => resetTable('customer_card_tokens', customerCardTokens))
    .then(() => resetTable('order_payment_methods', orderPaymentMethods))
    .then(() => resetTable('brands_rewards', brandsRewards))
    .then(() => resetTable('coupon_details', couponDetails))
    .then(() => resetTable('gift_card_collections', giftCardCollections))
    .then(() => resetTable('gift_card_templates', giftCardTemplates))
    .then(() => resetTable('gift_card_orders', giftCardOrders))
    .then(() => resetTable('gift_cards', giftCards))
    .then(() => resetTable('gift_card_transactions', giftCardTransactions))
    .then(() => resetTable('categories', categories))
    .then(() => resetTable('products', products))
    .then(() => resetTable('products_categories', productsCategories))
    .then(() => resetTable('product_images', productImages))
    .then(() => resetTable('pickup_locations', pickupLocations))
    .then(() => resetTable('inventories', inventories))
    .then(() => resetTable('shipping_policies', shippingPolicies))
    .then(() => resetTable('return_policies', returnPolicies))
    .then(() => resetTable('country_configuration', countryConfiguration))
    .then(() => resetTable('customer_groups', customerGroups))
    .then(() =>
      resetTable('customer_groups_customers', customerGroupsCustomers)
    )
    .then(() => resetTable('referrals', referrals))
    .then(() => resetTable('blog_category', blogCategories))
    .then(() => resetTable('blog_post', blogPosts));
}

module.exports = {
  seed,
  coupons,
  customers,
  brands,
  neighborhoods,
  brandLocations,
  brandLocationsNeighborhoods,
  admins,
  brandAdmins,
  permissions,
  groups,
  groupRoles,
  nestedGroups,
  groupAdmins,
  roles,
  rolePermissions,
  nutritionalInfo,
  menus,
  menuSections,
  menuItems,
  orderSets,
  menuItemOptionSets,
  menuItemOptions,
  orderFulfillments,
  weeklySchedule,
  orderItems,
  scheduleExceptions,
  orderItemOptions,
  configuration,
  brandsCoupons,
  customersCoupons,
  customerAddresses,
  cofeDistrictWeeklySchedule,
  deliveryAddresses,
  allergens,
  nutritionalInfoAllergens,
  paymentStatuses,
  loyaltyTiers,
  loyaltyBonuses,
  loyaltyOrders,
  currencies,
  countries,
  cities,
  banners,
  goldenCofeBrands,
  goldenCofeTerms,
  customerCardTokens,
  couponDetails,
  giftCardCollections,
  giftCardTemplates,
  giftCardOrders,
  giftCards,
  giftCardTransactions,
  categories,
  products,
  pickupLocations,
  referrals,
  countryConfiguration,
  customerGroups,
  blogCategories,
  blogPosts,
};
