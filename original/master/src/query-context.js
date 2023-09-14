const { graphql } = require('graphql');
const { first, get, includes, forEach, map } = require('lodash');
const kinesisLogger = require('./lib/aws-kinesis-logging');
const generalCCCService = require('./lib/general-ccc-service');
const Bank = require('./schema/bank/model');
const BankCard = require('./schema/bank-card/model');
const Brand = require('./schema/brand/model');
const Allergen = require('./schema/allergen/model');
const BrandLocation = require('./schema/brand-location/model');
const BrandLocationAddress = require('./schema/brand-location-address/model');
const BrandLocationActivityLogs = require('./schema/brand-location-activity-logs/model');
const BrandLocationFacility = require('./schema/brand-location-facility/model');
const BrandLocationPriceRule = require('./schema/brand-location-price-rule/model');
const BrandLocationWeeklySchedule = require('./schema/brand-location-weekly-schedule/model');
const BrandLocationScheduleException = require('./schema/brand-location-schedule-exception/model');
const BrandLocationAvailability = require('./schema/brand-location-availability/model');
const BrandLocationAcceptingOrders = require('./schema/brand-location-accepting-orders/model');
const Configuration = require('./schema/configuration/model');
const Coupon = require('./schema/coupon/model');
const CouponDetail = require('./schema/coupon-detail/model');
const Customer = require('./schema/customer/model');
const AuthCustomer = require('./schema/auth-customer/model');
const CustomerAddress = require('./schema/customer-address/model');
const CustomerCar = require('./schema/customer-car/model');
const CustomerDeviceMetadata = require('./schema/customer-device-metadata/model');
const WalletAccount = require('./schema/wallet-account/model');
const DeliveryAddress = require('./schema/delivery-address/model');
const DeliverySchedule = require('./schema/delivery-schedule/model');
const LoyaltyBonus = require('./schema/loyalty-bonus/model');
const LoyaltyTier = require('./schema/loyalty-tier/model');
const LoyaltyOrder = require('./schema/loyalty-order/model');
const LoyaltyTransaction = require('./schema/loyalty-transaction/model');
const MarketingNotification = require('./schema/marketing-notification/model');
const Menu = require('./schema/menu/model');
const MenuItem = require('./schema/menu-item/model');
const MenuItemOption = require('./schema/menu-item-option/model');
const MenuItemOptionSet = require('./schema/menu-item-option-set/model');
const MenuSection = require('./schema/menu-section/model');
const Neighborhood = require('./schema/neighborhood/model');
const Currency = require('./schema/currency/model');
const Country = require('./schema/country/model');
const City = require('./schema/city/model');
const { Notification } = require('./lib/notifications');
const NutritionalInfo = require('./schema/nutritional-info/model');
const OrderFulfillment = require('./schema/order-fulfillment/model');
const OrderItem = require('./schema/order-item/model');
const OrderItemOption = require('./schema/order-item-option/model');
const OrderSet = require('./schema/order-set/model');
const OrderSetStatus = require('./schema/order-set-status/model');
const PaymentStatus = require('./schema/payment-status/model');
const ScheduleException = require('./schema/schedule-exception/model');
const WeeklySchedule = require('./schema/weekly-schedule/model');
const Tower = require('./schema/tower/model');
const FlickToken = require('./schema/flick-token/model');
const OrderSetComment = require('./schema/order-set-comment/model');
const CustomerStats = require('./schema/customer-stats/model');
const Reward = require('./schema/reward/model');
const RewardTier = require('./schema/reward-tier/model');
const RewardTierPerk = require('./schema/reward-tier-perk/model');
const RewardPointsTransaction = require('./schema/reward-points-transaction/model');
const CustomerTier = require('./schema/customer-tier/model');
const CustomerPerk = require('./schema/customer-perk/model');
const CustomerUsedPerk = require('./schema/customer-used-perk/model');
const Transaction = require('./schema/transaction/model');
const Banner = require('./schema/banner/model');
const GoldenCofe = require('./schema/golden-cofe-terms/model');
const AddressField = require('./schema/customer-address-fields/model');
const Admin = require('./schema/admin/model');
const BrandAdmin = require('./schema/brand-admin/model');
const Permission = require('./schema/permission/model');
const Group = require('./schema/group/model');
const Role = require('./schema/role/model');
const RolePermission = require('./schema/role-permission/model');
const GroupRole = require('./schema/group-role/model');
const NestedGroup = require('./schema/nested-group/model');
const GroupAdmin = require('./schema/group-admin/model');
const InternalComment = require('./schema/internal-comment/model');
const CustomerCardToken = require('./schema/customer-card-token/model');
const OrderPaymentMethod = require('./schema/order-payment-method/model');
const PaymentServiceLog = require('./schema/payment-service-log/model');
const UsedCouponDetail = require('./schema/used-coupon-detail/model');
const GiftCardCollection = require('./schema/gift-card-collection/model');
const GiftCardTemplate = require('./schema/gift-card-template/model');
const GiftCard = require('./schema/gift-card/model');
const GiftCardOrder = require('./schema/gift-card-order/model');
const GiftCardTransaction = require('./schema/gift-card-transaction/model');
const Referral = require('./schema/referral/model');
const Category = require('./schema/category/model');
const Product = require('./schema/product/model');
const ProductImage = require('./schema/product-image/model');
const PickupLocation = require('./schema/pickup-location/model');
const Inventory = require('./schema/inventory/model');
const ShippingPolicy = require('./schema/shipping-policy/model');
const StoreHeader = require('./schema/store-header/model');
const ProductsCatalog = require('./schema/products-catalog/model');
const ReturnPolicy = require('./schema/return-policy/model');
const StoreOrder = require('./schema/store-order/model');
const StoreOrderProduct = require('./schema/store-order-product/model');
const StoreOrderStatus = require('./schema/store-order-status/model');
const SignupPromo = require('./schema/signup-promo/model');
const StoreOrderSet = require('./schema/store-order-set/model');
const StoreOrderSetStatus = require('./schema/store-order-set-status/model');
const StoreOrderSetFulfillment = require('./schema/store-order-set-fulfillment/model');
const TrackingInfo = require('./schema/tracking-info/model');
const WalletAccountCashback = require('./schema/wallet-account-cashback/model');
const CustomerGroup = require('./schema/customer-group/model');
const BlogCategory = require('./schema/blog-category/model');
const BlogPost = require('./schema/blog-post/model');
const UserActivityLog = require('./schema/user-activity-logs/model');
const NewBrands = require('./schema/new_brands/model');
const DiscoveryCredit = require('./schema/discovery-credit/model');
const DiscoveryCreditRedemption = require('./schema/discovery-credit-redemption/model');
const WalletAccountReferral = require('./schema/wallet-account-referral/model');
const VendorPortalDashboard = require('./schema/vendor-portal-dashboard/model');
const BrandSubscriptionModel = require('./schema/brand-subscription-model/model');
const OrderRevenue = require('./schema/order-revenues/model');
const BrandLocationDevice = require('./schema/brand-location-device/model');
const Events = require('./schema/events/model');
const FirebaseCloudMessaging = require('./schema/firebase-cloud-messaging/model');
const OtpAvailableCountries = require('./schema/otp-available-countries/model');
const BrandLocationMaintenance = require('./schema/brand-location-maintenance/model');
const CofelyticsOffers = require('./schema/cofelytics-offers/model');
const CustomerAccountDeletionReason = require(
  './schema/customer-account-deletion-reason/model'
);
const CustomerAccountDeletionRequest = require(
  './schema/customer-account-deletion-request/model'
);

const CustomerFavoriteBrandLocation = require('./schema/customer-favorite-brand-location/model');
const OrderRating = require('./schema/order-rating/model');
const OrderRatingQuestion = require('./schema/order-rating-questions/model');
const Badge = require('./schema/badge/model');
const Tag = require('./schema/tag/model');
const TagRelation = require('./schema/tag-relation/model');
// Services
const PaymentService = require('./payment-service');
const ZendeskService = require('./zendesk-service');
const CountryConfiguration = require('./schema/country-configuration/model');
const CustomerCurrentLocationCache = require('./schema/customer-current-location-cache/model');
const ContactUs = require('./schema/contact-us/model');
const PartnerRequest = require('./schema/partner-request/model');
const ScheduledNotification = require('./schema/scheduled-notification/service');

const locales = require('./locales');
const AuthService = require('./schema/auth/service');
const InternalAuthService = require('./schema/auth/internal-service');
const AdminBranchSubscription = require('./schema/admin-branch-subscription/model');
const BrandCommissionModel = require('./schema/brand-commission-model/model');
const PaymentGatewayCharge = require('./schema/payment-gateway-charge/model');
const { sqlCache } = require('./lib/sql-cache');
const { isTest, isDev, env } = require('../config');
const SlackWebHookManager = require('./schema/slack-webhook-manager/slack-webhook-manager');

const ArrivingTime = require('./schema/arriving-time/model');

const SuggestBrand = require('./schema/suggest-brand/model');
const Driver = require('./schema/driver/model');

const cSubscription = require('./schema/c-subscription/model');
const cSubscriptionCustomer = require('./schema/c-subscription-customer/model');
const cSubscriptionCustomerAutoRenewal = require(
  './schema/c-subscription-customer-auto-renewal/model'
);
const cSubscriptionCustomerAutoRenewalStatus = require(
  './schema/c-subscription-customer-auto-renewal-status/model'
);
const cSubscriptionCustomerTransaction = require('./schema/c-subscription-customer-transaction/model');
const cSubscriptionMenuItem = require('./schema/c-subscription-menu-item/model');
const cSubscriptionMenuItemOption = require('./schema/c-subscription-menu-item-option/model');
const cSubscriptionOrder = require('./schema/c-subscription-order/model');
const cSubscriptionWeeklyOffer = require('./schema/c-subscription-weekly-offer/model');
//const cSubscriptionBrand = require('./schema/c-subscription-brand/model');

const CommonContent = require('./schema/common-content/model');
const CommonContentCategory = require('./schema/common-content-category/model');

const SplashCategory = require('./schema/splash-category/model');
const SplashCategoryContent = require('./schema/splash-category-content/model');

const HomePageSection = require('./schema/home-page-section/model');
const HomePageSectionSetting = require('./schema/home-page-section-setting/model');
const BorderedCardItem = require('./schema/home-page-bordered-card-item/model');
const CardListItem = require('./schema/home-page-card-list-item/model');
const CarouselItemSetting = require('./schema/home-page-carousel-item-setting/model');
const CarouselItem = require('./schema/home-page-carousel-item/model');
const IconButtonItem = require('./schema/home-page-icon-button-item/model');
const IconButtonItemSetting = require('./schema/home-page-icon-button-setting/model');

const FilterSet = require('./schema/filter-set/model');
const TapCustomer = require('./schema/tap-customer/model');

const StampRewardCustomer = require('./schema/stamp-reward-customers/model');
const StampRewardEligibleItem = require('./schema/stamp-reward-eligible-item/model');
const StampRewardRedemptionItem = require('./schema/stamp-reward-redemption-item/model');
const StampRewardLog = require('./schema/stamp-reward-logs/model');

class QueryContext {
  // eslint-disable-next-line max-params
  constructor(dbHandles, redis, auth, pubsub, schema, req = {}) {
    const db = dbHandles.handle;
    this.__ = locales();
    this.vars = {};
    this.db = db;
    this.roDb = (() => {
      return dbHandles.roHandle ? dbHandles.roHandle : db;
    })();
    this.redis = redis;
    this.auth = auth;
    this.pubsub = pubsub;
    this.schema = schema;
    this.skipAuthChecks = false; // Flag used to skip authentication checks. Used for internal graphql querys for Emails
    this.sqlCache = sqlCache(req.sqlCacheEnabled || false);
    this.req = req;

    this.requestId = req?.requestId || 'none';
    this.clientIp = req?.clientIp || 'none';
    this.kinesisLogger = {
      sendLogEvent: async (eventObject, eventType, indexName) => {
        try {
          const userId = this.auth && this.auth.id ? this.auth.id : get(req.user, 'sub') || undefined;
          const authProvider = this.auth && this.auth.id ? this.auth.authProvider : get(req.user, 'authProvider') || undefined;
          const token = req.headers?.authorization || undefined;
          const requestId = this.requestId || 'out-of-context';
          const clientVer = (req && req.headers && req.headers['apollographql-client-version'])
            ? req.headers['apollographql-client-version']
            : undefined;
          const clientOs = (req && req.headers && req.headers['apollographql-client-name'])
            ? req.headers['apollographql-client-name']
            : undefined;
          const clientUserAgent = (req && req.headers && req.headers['user-agent'])
            ? req.headers['user-agent']
            : undefined;
          const msgObj = {
            requestId,
            authProvider,
            token,
            userId,
            clientOs,
            clientVer,
            clientUserAgent,
            ip: this.clientIp,
            data: eventObject,
          };
          await kinesisLogger.sendLogEvent(msgObj, eventType, indexName);
        } catch (e) {
          console.log('KinesisQC-Error:', e);
        }
      },
    };

    this.generalCCCService = {
      alertIt: async ({ text, object, image, path }) => {
        await generalCCCService.alertIt({ text, object, image, path });
      },
      logIt: async ({ eventType, eventObject, indexName }) => {
        await generalCCCService.logIt({ eventType, eventObject, indexName });
      },
      sendItToSqs: async (type, message, delay) => {
        await generalCCCService.sendItToSqs(type, message, delay);
      }
    };

    // Check for a given permission
    this.checkPermission = (perm, fieldName) => {
      let perms = get(this.auth, 'permissions', []);
      if (perm) {
        perm = perm.toLowerCase();
      }
      if (perms.length > 0) {
        perms = map(perms, p => p.toLowerCase());
      }
      const userShallPass = includes(perms, perm);
      if (!userShallPass) {
        SlackWebHookManager.sendTextToSlack(
          `
[!!!PermissionDenied!!!]
Endpoint: ${fieldName ? fieldName : '--internal--'} / ExpectedPermission: ${JSON.stringify(perm)}
Email: ${this.auth.email} / Id: ${this.auth.id} / PermissionsCount: ${perms.length} / IP: ${this.clientIp} / Provider: ${this.auth.authProvider}
RequestId: ${this.requestId}`);
        throw new Error('Unauthorized to perform this action');
      }
    };
  }

  get allergen() {
    if (this._allergen === undefined) {
      this._allergen = new Allergen(this.db);
    }
    return this._allergen;
  }

  get authService() {
    if (this._authService === undefined) {
      this._authService = new AuthService();
    }
    return this._authService;
  }

  get internalAuthService() {
    if (this._internalAuthService === undefined) {
      this._internalAuthService = new InternalAuthService(this);
    }
    return this._internalAuthService;
  }

  get configuration() {
    if (this._configuration === undefined) {
      this._configuration = new Configuration(this.db, this);
    }
    return this._configuration;
  }

  get bank() {
    if (this._bank === undefined) {
      this._bank = new Bank(this.db, this);
    }
    return this._bank;
  }

  get bankCard() {
    if (this._bankCard === undefined) {
      this._bankCard = new BankCard(this.db, this);
    }
    return this._bankCard;
  }

  get brand() {
    if (this._brand === undefined) {
      this._brand = new Brand(this.db, this);
    }
    return this._brand;
  }

  get brandLocation() {
    if (this._brandLocation === undefined) {
      this._brandLocation = new BrandLocation(this.db, this);
    }
    return this._brandLocation;
  }

  get brandLocationAddress() {
    if (this._brandLocationAddress === undefined) {
      this._brandLocationAddress = new BrandLocationAddress(this.db);
    }
    return this._brandLocationAddress;
  }

  get brandLocationActivityLog() {
    if (this._brandLocationActivityLog === undefined) {
      this._brandLocationActivityLog = new BrandLocationActivityLogs(
        this.db,
        this
      );
    }
    return this._brandLocationActivityLog;
  }

  get brandLocationFacility() {
    if (this._brandLocationFacility === undefined) {
      this._brandLocationFacility = new BrandLocationFacility(this.db, this);
    }
    return this._brandLocationFacility;
  }

  get brandLocationPriceRule() {
    if (this._brandLocationPriceRule === undefined) {
      this._brandLocationPriceRule = new BrandLocationPriceRule(this.db, this);
    }
    return this._brandLocationPriceRule;
  }

  get brandLocationWeeklySchedule() {
    if (this._brandLocationWeeklySchedule === undefined) {
      this._brandLocationWeeklySchedule = new BrandLocationWeeklySchedule(this.db, this);
    }
    return this._brandLocationWeeklySchedule;
  }

  get brandLocationScheduleException() {
    if (this._brandLocationScheduleException === undefined) {
      this._brandLocationScheduleException = new BrandLocationScheduleException(this.db, this);
    }
    return this._brandLocationScheduleException;
  }

  get brandLocationAvailability() {
    if (this._brandLocationAvailability === undefined) {
      this._brandLocationAvailability = new BrandLocationAvailability(this.db, this);
    }
    return this._brandLocationAvailability;
  }

  get brandLocationAcceptingOrders() {
    if (this._brandLocationAcceptingOrders === undefined) {
      this._brandLocationAcceptingOrders = new BrandLocationAcceptingOrders(this.db, this);
    }
    return this._brandLocationAcceptingOrders;
  }

  get coupon() {
    if (this._coupon === undefined) {
      this._coupon = new Coupon(this.db, this);
    }
    return this._coupon;
  }

  get couponDetail() {
    if (this._couponDetail === undefined) {
      this._couponDetail = new CouponDetail(this.db, this);
    }
    return this._couponDetail;
  }

  get customer() {
    if (this._customer === undefined) {
      this._customer = new Customer(this.db, this);
    }
    return this._customer;
  }

  get authCustomer() {
    if (this._authCustomer === undefined) {
      this._authCustomer = new AuthCustomer(this.db, this);
    }
    return this._authCustomer;
  }

  get customerAddress() {
    if (this._customerAddress === undefined) {
      this._customerAddress = new CustomerAddress(this.db, this);
    }
    return this._customerAddress;
  }

  get customerCar() {
    if (this._customerCar === undefined) {
      this._customerCar = new CustomerCar(this.db, this);
    }
    return this._customerCar;
  }

  get customerGroup() {
    if (this._customerGroup === undefined) {
      this._customerGroup = new CustomerGroup(this.db, this);
    }
    return this._customerGroup;
  }

  get deviceMetadata() {
    if (this._deviceMetadata === undefined) {
      this._deviceMetadata = new CustomerDeviceMetadata(this.db, this);
    }
    return this._deviceMetadata;
  }

  get walletAccount() {
    if (this._walletAccount === undefined) {
      this._walletAccount = new WalletAccount(this.db, this);
    }
    return this._walletAccount;
  }

  get customerStats() {
    if (this._customerStats === undefined) {
      this._customerStats = new CustomerStats(this.db, this);
    }
    return this._customerStats;
  }

  get deliveryAddress() {
    if (this._deliveryAddress === undefined) {
      this._deliveryAddress = new DeliveryAddress(this.db, this);
    }
    return this._deliveryAddress;
  }

  get deliverySchedule() {
    if (this._deliverySchedule === undefined) {
      this._deliverySchedule = new DeliverySchedule(this.db, this);
    }
    return this._deliverySchedule;
  }

  get loyaltyBonus() {
    if (this._loyaltyBonus === undefined) {
      this._loyaltyBonus = new LoyaltyBonus(this.db, this);
    }
    return this._loyaltyBonus;
  }

  get loyaltyTier() {
    if (this._loyaltyTier === undefined) {
      this._loyaltyTier = new LoyaltyTier(this.db, this);
    }
    return this._loyaltyTier;
  }

  get loyaltyOrder() {
    if (this._loyaltyOrder === undefined) {
      this._loyaltyOrder = new LoyaltyOrder(this.db, this);
    }
    return this._loyaltyOrder;
  }

  get loyaltyTransaction() {
    if (this._loyaltyTransaction === undefined) {
      this._loyaltyTransaction = new LoyaltyTransaction(this.db, this);
    }
    return this._loyaltyTransaction;
  }

  get marketingNotification() {
    if (this._marketingNotification === undefined) {
      this._marketingNotification = new MarketingNotification(this.db, this);
    }
    return this._marketingNotification;
  }

  get menu() {
    if (this._menu === undefined) {
      this._menu = new Menu(this.db);
    }
    return this._menu;
  }

  get menuItem() {
    if (this._menuItem === undefined) {
      this._menuItem = new MenuItem(this.db, this);
    }
    return this._menuItem;
  }

  get menuItemOption() {
    if (this._menuItemOption === undefined) {
      this._menuItemOption = new MenuItemOption(this.db, this);
    }
    return this._menuItemOption;
  }

  get menuItemOptionSet() {
    if (this._menuItemOptionSet === undefined) {
      this._menuItemOptionSet = new MenuItemOptionSet(this.db);
    }
    return this._menuItemOptionSet;
  }

  get menuSection() {
    if (this._menuSection === undefined) {
      this._menuSection = new MenuSection(this.db, this);
    }
    return this._menuSection;
  }

  get neighborhood() {
    if (this._neighborhood === undefined) {
      this._neighborhood = new Neighborhood(this.db, this);
    }
    return this._neighborhood;
  }

  get currency() {
    if (this._currency === undefined) {
      this._currency = new Currency(this.db, this);
    }
    return this._currency;
  }

  get country() {
    if (this._country === undefined) {
      this._country = new Country(this.db, this);
    }
    return this._country;
  }

  get city() {
    if (this._city === undefined) {
      this._city = new City(this.db, this);
    }
    return this._city;
  }

  get notification() {
    if (this._notification === undefined) {
      this._notification = new Notification(this.db, this);
    }
    return this._notification;
  }

  get nutritionalInfo() {
    if (this._nutritionalInfo === undefined) {
      this._nutritionalInfo = new NutritionalInfo(this.db);
    }
    return this._nutritionalInfo;
  }

  get orderFulfillment() {
    if (this._orderFulfillment === undefined) {
      this._orderFulfillment = new OrderFulfillment(this.db, this);
    }
    return this._orderFulfillment;
  }

  get orderItem() {
    if (this._orderItem === undefined) {
      this._orderItem = new OrderItem(this.db, this);
    }
    return this._orderItem;
  }

  get orderItemOption() {
    if (this._orderItemOption === undefined) {
      this._orderItemOption = new OrderItemOption(this.db, this);
    }
    return this._orderItemOption;
  }

  get orderSet() {
    if (this._orderSet === undefined) {
      this._orderSet = new OrderSet(this.db, this);
    }
    return this._orderSet;
  }

  get orderSetComment() {
    if (this._orderSetComment === undefined) {
      this._orderSetComment = new OrderSetComment(this.db, this);
    }
    return this._orderSetComment;
  }

  get orderSetStatus() {
    if (this._orderSetStatus === undefined) {
      this._orderSetStatus = new OrderSetStatus(this.db, this);
    }
    return this._orderSetStatus;
  }

  get paymentStatus() {
    if (this._paymentStatus === undefined) {
      this._paymentStatus = new PaymentStatus(this.db, this);
    }
    return this._paymentStatus;
  }

  get scheduleException() {
    if (this._scheduleException === undefined) {
      this._scheduleException = new ScheduleException(this.db);
    }
    return this._scheduleException;
  }

  get weeklySchedule() {
    if (this._weeklySchedule === undefined) {
      this._weeklySchedule = new WeeklySchedule(this.db, this);
    }
    return this._weeklySchedule;
  }

  get tower() {
    if (this._tower === undefined) {
      this._tower = new Tower(this.db);
    }
    return this._tower;
  }

  get flickToken() {
    if (this._flickToken === undefined) {
      this._flickToken = new FlickToken(this.db, this);
    }
    return this._flickToken;
  }

  get reward() {
    if (this._reward === undefined) {
      this._reward = new Reward(this.db, this);
    }
    return this._reward;
  }

  get rewardTier() {
    if (this._rewardTier === undefined) {
      this._rewardTier = new RewardTier(this.db, this);
    }
    return this._rewardTier;
  }

  get rewardTierPerk() {
    if (this._rewardTierPerk === undefined) {
      this._rewardTierPerk = new RewardTierPerk(this.db, this);
    }
    return this._rewardTierPerk;
  }

  get rewardPointsTransaction() {
    if (this._rewardPointsTransaction === undefined) {
      this._rewardPointsTransaction = new RewardPointsTransaction(
        this.db,
        this
      );
    }
    return this._rewardPointsTransaction;
  }

  get customerTier() {
    if (this._customerTier === undefined) {
      this._customerTier = new CustomerTier(this.db, this);
    }
    return this._customerTier;
  }

  get customerPerk() {
    if (this._customerPerk === undefined) {
      this._customerPerk = new CustomerPerk(this.db, this);
    }
    return this._customerPerk;
  }

  get customerUsedPerk() {
    if (this._customerUsedPerk === undefined) {
      this._customerUsedPerk = new CustomerUsedPerk(this.db, this);
    }
    return this._customerUsedPerk;
  }

  get transaction() {
    if (this._transaction === undefined) {
      this._transaction = new Transaction(this.db, this);
    }
    return this._transaction;
  }

  get banner() {
    if (this._banner === undefined) {
      this._banner = new Banner(this.db, this);
    }
    return this._banner;
  }

  get goldenCofe() {
    if (this._goldenCofe === undefined) {
      this._goldenCofe = new GoldenCofe(this.db, this);
    }
    return this._goldenCofe;
  }

  get addressField() {
    if (this._addressField === undefined) {
      this._addressField = new AddressField(this.db, this);
    }
    return this._addressField;
  }

  get admin() {
    if (this._admin === undefined) {
      this._admin = new Admin(this.db, this);
    }
    return this._admin;
  }

  get brandAdmin() {
    if (this._brandAdmin === undefined) {
      this._brandAdmin = new BrandAdmin(this.db, this);
    }
    return this._brandAdmin;
  }

  get permission() {
    if (this._permission === undefined) {
      this._permission = new Permission(this.db, this);
    }
    return this._permission;
  }

  get group() {
    if (this._group === undefined) {
      this._group = new Group(this.db, this);
    }
    return this._group;
  }

  get role() {
    if (this._role === undefined) {
      this._role = new Role(this.db, this);
    }
    return this._role;
  }

  get rolePermission() {
    if (this._rolePermission === undefined) {
      this._rolePermission = new RolePermission(this.db, this);
    }
    return this._rolePermission;
  }

  get groupRole() {
    if (this._groupRole === undefined) {
      this._groupRole = new GroupRole(this.db, this);
    }
    return this._groupRole;
  }

  get nestedGroup() {
    if (this._nestedGroup === undefined) {
      this._nestedGroup = new NestedGroup(this.db, this);
    }
    return this._nestedGroup;
  }

  get groupAdmin() {
    if (this._groupAdmin === undefined) {
      this._groupAdmin = new GroupAdmin(this.db, this);
    }
    return this._groupAdmin;
  }

  get internalComment() {
    if (this._internalComment === undefined) {
      this._internalComment = new InternalComment(this.db, this);
    }
    return this._internalComment;
  }

  get customerCardToken() {
    if (this._customerCardToken === undefined) {
      this._customerCardToken = new CustomerCardToken(this.db, this);
    }
    return this._customerCardToken;
  }

  get orderPaymentMethod() {
    if (this._orderPaymentMethod === undefined) {
      this._orderPaymentMethod = new OrderPaymentMethod(this.db, this);
    }
    return this._orderPaymentMethod;
  }

  get paymentServiceLog() {
    if (this._paymentServiceLog === undefined) {
      this._paymentServiceLog = new PaymentServiceLog(this.db, this);
    }
    return this._paymentServiceLog;
  }

  get usedCouponDetail() {
    if (this._usedCouponDetail === undefined) {
      this._usedCouponDetail = new UsedCouponDetail(this.db, this);
    }
    return this._usedCouponDetail;
  }

  get giftCardCollection() {
    if (this._giftCardCollection === undefined) {
      this._giftCardCollection = new GiftCardCollection(this.db, this);
    }
    return this._giftCardCollection;
  }

  get giftCardTemplate() {
    if (this._giftCardTemplate === undefined) {
      this._giftCardTemplate = new GiftCardTemplate(this.db, this);
    }
    return this._giftCardTemplate;
  }

  get giftCard() {
    if (this._giftCard === undefined) {
      this._giftCard = new GiftCard(this.db, this);
    }
    return this._giftCard;
  }

  get giftCardOrder() {
    if (this._giftCardOrder === undefined) {
      this._giftCardOrder = new GiftCardOrder(this.db, this);
    }
    return this._giftCardOrder;
  }

  get giftCardTransaction() {
    if (this._giftCardTransaction === undefined) {
      this._giftCardTransaction = new GiftCardTransaction(this.db, this);
    }
    return this._giftCardTransaction;
  }

  get referral() {
    if (this._referral === undefined) {
      this._referral = new Referral(this.db, this);
    }
    return this._referral;
  }

  get category() {
    if (this._category === undefined) {
      this._category = new Category(this.db, this);
    }
    return this._category;
  }

  get product() {
    if (this._product === undefined) {
      this._product = new Product(this.db, this);
    }
    return this._product;
  }

  get productImage() {
    if (this._productImage === undefined) {
      this._productImage = new ProductImage(this.db, this);
    }
    return this._productImage;
  }

  get pickupLocation() {
    if (this._pickupLocation === undefined) {
      this._pickupLocation = new PickupLocation(this.db, this);
    }
    return this._pickupLocation;
  }

  get inventory() {
    if (this._inventory === undefined) {
      this._inventory = new Inventory(this.db, this);
    }
    return this._inventory;
  }

  get shippingPolicy() {
    if (this._shippingPolicy === undefined) {
      this._shippingPolicy = new ShippingPolicy(this.db, this);
    }
    return this._shippingPolicy;
  }

  get storeHeader() {
    if (this._storeHeader === undefined) {
      this._storeHeader = new StoreHeader(this.db, this);
    }
    return this._storeHeader;
  }

  get productsCatalog() {
    if (this._productsCatalog === undefined) {
      this._productsCatalog = new ProductsCatalog(this.db, this);
    }
    return this._productsCatalog;
  }

  get returnPolicy() {
    if (this._returnPolicy === undefined) {
      this._returnPolicy = new ReturnPolicy(this.db, this);
    }
    return this._returnPolicy;
  }

  get storeOrder() {
    if (this._storeOrder === undefined) {
      this._storeOrder = new StoreOrder(this.db, this);
    }
    return this._storeOrder;
  }

  get storeOrderProduct() {
    if (this._storeOrderProduct === undefined) {
      this._storeOrderProduct = new StoreOrderProduct(this.db, this);
    }
    return this._storeOrderProduct;
  }

  get storeOrderStatus() {
    if (this._storeOrderStatus === undefined) {
      this._storeOrderStatus = new StoreOrderStatus(this.db, this);
    }
    return this._storeOrderStatus;
  }

  get storeOrderSet() {
    if (this._storeOrderSet === undefined) {
      this._storeOrderSet = new StoreOrderSet(this.db, this);
    }
    return this._storeOrderSet;
  }

  get storeOrderSetStatus() {
    if (this._storeOrderSetStatus === undefined) {
      this._storeOrderSetStatus = new StoreOrderSetStatus(this.db, this);
    }
    return this._storeOrderSetStatus;
  }

  get storeOrderSetFulfillment() {
    if (this._storeOrderSetFulfillment === undefined) {
      this._storeOrderSetFulfillment = new StoreOrderSetFulfillment(
        this.db,
        this
      );
    }
    return this._storeOrderSetFulfillment;
  }

  get trackingInfo() {
    if (this._trackingInfo === undefined) {
      this._trackingInfo = new TrackingInfo(this.db, this);
    }
    return this._trackingInfo;
  }

  get walletAccountCashback() {
    if (this._walletAccountCashback === undefined) {
      this._walletAccountCashback = new WalletAccountCashback(this.db, this);
    }
    return this._walletAccountCashback;
  }

  get signupPromo() {
    if (this._signupPromo === undefined) {
      this._signupPromo = new SignupPromo(this.db, this);
    }
    return this._signupPromo;
  }

  get blogCategory() {
    if (this._blogCategory === undefined) {
      this._blogCategory = new BlogCategory(this.db, this);
    }
    return this._blogCategory;
  }

  get blogPost() {
    if (this._blogPost === undefined) {
      this._blogPost = new BlogPost(this.db, this);
    }
    return this._blogPost;
  }

  get userActivityLog() {
    if (this._userActivityLog === undefined) {
      this._userActivityLog = new UserActivityLog(this.db, this);
    }
    return this._userActivityLog;
  }

  get newBrands() {
    if (this._newBrands === undefined) {
      this._newBrands = new NewBrands(this.db, this);
    }
    return this._newBrands;
  }

  get vendorPortalDashboard() {
    if (this._vendorPortalDashboard === undefined) {
      this._vendorPortalDashboard = new VendorPortalDashboard(this.db, this);
    }
    return this._vendorPortalDashboard;
  }

  get discoveryCredit() {
    if (this._discoveryCredit === undefined) {
      this._discoveryCredit = new DiscoveryCredit(this.db, this);
    }
    return this._discoveryCredit;
  }

  get discoveryCreditRedemption() {
    if (this._discoveryCreditRedemption === undefined) {
      this._discoveryCreditRedemption = new DiscoveryCreditRedemption(
        this.db,
        this
      );
    }
    return this._discoveryCreditRedemption;
  }

  get walletAccountReferral() {
    if (this._walletAccountReferral === undefined) {
      this._walletAccountReferral = new WalletAccountReferral(this.db, this);
    }
    return this._walletAccountReferral;
  }

  get brandSubscriptionModel() {
    if (this._brandSubscriptionModel === undefined) {
      this._brandSubscriptionModel = new BrandSubscriptionModel(this.db, this);
    }
    return this._brandSubscriptionModel;
  }

  get orderRevenue() {
    if (this._orderRevenue === undefined) {
      this._orderRevenue = new OrderRevenue(this.db, this);
    }
    return this._orderRevenue;
  }

  get brandLocationDevice() {
    if (this._brandLocationDevice === undefined) {
      this._brandLocationDevice = new BrandLocationDevice(this.db, this);
    }
    return this._brandLocationDevice;
  }

  get paymentService() {
    if (this._paymentService === undefined) {
      this._paymentService = new PaymentService(this.db, this);
    }
    return this._paymentService;
  }

  get zendeskService() {
    if (this._zendeskService === undefined) {
      this._zendeskService = new ZendeskService(this.db, this);
    }
    return this._zendeskService;
  }

  get countryConfiguration() {
    if (this._countryConfiguration === undefined) {
      this._countryConfiguration = new CountryConfiguration(this.db, this);
    }
    return this._countryConfiguration;
  }

  get customerCurrentLocationCache() {
    if (this._customerCurrentLocationCache === undefined) {
      this._customerCurrentLocationCache = new CustomerCurrentLocationCache(
        this.db,
        this
      );
    }
    return this._customerCurrentLocationCache;
  }

  get scheduledNotification() {
    if (this._scheduledNotification === undefined) {
      this._scheduledNotification = new ScheduledNotification(this);
    }
    return this._scheduledNotification;
  }

  get contactUs() {
    if (this._contactUs === undefined) {
      this._contactUs = new ContactUs(this.db, this);
    }
    return this._contactUs;
  }

  get partnerRequest() {
    if (this._partnerRequest === undefined) {
      this._partnerRequest = new PartnerRequest(this.db, this);
    }
    return this._partnerRequest;
  }

  get adminBranchSubscription() {
    if (this._adminBranchSubscription === undefined) {
      this._adminBranchSubscription = new AdminBranchSubscription(
        this.db,
        this
      );
    }
    return this._adminBranchSubscription;
  }

  get brandCommissionModel() {
    if (this._brandCommissionModel === undefined) {
      this._brandCommissionModel = new BrandCommissionModel(this.db, this);
    }
    return this._brandCommissionModel;
  }

  get events() {
    if (this._events === undefined) {
      this._events = new Events(this.db, this);
    }
    return this._events;
  }

  get paymentGatewayCharge() {
    if (this._paymentGatewayCharge === undefined) {
      this._paymentGatewayCharge = new PaymentGatewayCharge(this.db, this);
    }
    return this._paymentGatewayCharge;
  }

  get brandLocationMaintenance() {
    if (this._brandLocationMaintenance === undefined) {
      this._brandLocationMaintenance = new BrandLocationMaintenance(this.db, this);
    }
    return this._brandLocationMaintenance;
  }

  get cofelyticsOffers() {
    if (this._cofelyticsOffers === undefined) {
      this._cofelyticsOffers = new CofelyticsOffers(this.db, this);
    }
    return this._cofelyticsOffers;
  }

  get otpAvailableCountries() {
    if (this._otpAvailableCountries === undefined) {
      this._otpAvailableCountries = new OtpAvailableCountries(this.db, this);
    }
    return this._otpAvailableCountries;
  }

  get firebaseCloudMessaging() {
    if (this._firebaseCloudMessaging === undefined) {
      this._firebaseCloudMessaging = new FirebaseCloudMessaging(this.db, this);
    }
    return this._firebaseCloudMessaging;
  }


  get arrivingTime() {
    if (this._arrivingTime === undefined) {
      this._arrivingTime = new ArrivingTime(
        this.db,
        this
      );
    }
    return this._arrivingTime;
  }

  get suggestBrand() {
    if (this._suggestBrand === undefined) {
      this._suggestBrand = new SuggestBrand(
        this.db,
        this
      );
    }
    return this._suggestBrand;
  }

  get customerFavoriteBrandLocation() {
    if (this._customerFavoriteBrandLocation === undefined) {
      this._customerFavoriteBrandLocation = new CustomerFavoriteBrandLocation(
        this.db,
        this
      );
    }
    return this._customerFavoriteBrandLocation;
  }

  get orderRating() {
    if (this._orderRating === undefined) {
      this._orderRating = new OrderRating(
        this.db,
        this
      );
    }
    return this._orderRating;
  }

  get orderRatingQuestion() {
    if (this._orderRatingQuestion === undefined) {
      this._orderRatingQuestion = new OrderRatingQuestion(
        this.db,
        this
      );
    }
    return this._orderRatingQuestion;
  }

  get customerAccountDeletionReason() {
    if (this._customerAccountDeletionReason === undefined) {
      this._customerAccountDeletionReason = new CustomerAccountDeletionReason(
        this.db,
        this
      );
    }
    return this._customerAccountDeletionReason;
  }

  get customerAccountDeletionRequest() {
    if (this._customerAccountDeletionRequest === undefined) {
      this._customerAccountDeletionRequest = new CustomerAccountDeletionRequest(
        this.db,
        this
      );
    }
    return this._customerAccountDeletionRequest;
  }

  get badge() {
    if (this._badge === undefined) {
      this._badge = new Badge(
        this.db,
        this
      );
    }
    return this._badge;
  }

  get tag() {
    if (this._tag === undefined) {
      this._tag = new Tag(
        this.db,
        this
      );
    }
    return this._tag;
  }

  get tagRelation() {
    if (this._tagRelation === undefined) {
      this._tagRelation = new TagRelation(
        this.db,
        this
      );
    }
    return this._tagRelation;
  }

  get driver() {
    if (this._driver === undefined) {
      this._driver = new Driver(this.db, this);
    }
    return this._driver;
  }

  get cSubscription() {
    if (this._cSubscription === undefined) {
      this._cSubscription = new cSubscription(
        this.db,
        this
      );
    }
    return this._cSubscription;
  }

  get cSubscriptionCustomer() {
    if (this._cSubscriptionCustomer === undefined) {
      this._cSubscriptionCustomer = new cSubscriptionCustomer(
        this.db,
        this
      );
    }
    return this._cSubscriptionCustomer;
  }

  get cSubscriptionCustomerAutoRenewal() {
    if (this._cSubscriptionCustomerAutoRenewal === undefined) {
      this._cSubscriptionCustomerAutoRenewal = new cSubscriptionCustomerAutoRenewal(
        this.db,
        this
      );
    }
    return this._cSubscriptionCustomerAutoRenewal;
  }

  get cSubscriptionCustomerAutoRenewalStatus() {
    if (this._cSubscriptionCustomerAutoRenewalStatus === undefined) {
      this._cSubscriptionCustomerAutoRenewalStatus = new cSubscriptionCustomerAutoRenewalStatus(
        this.db,
        this
      );
    }
    return this._cSubscriptionCustomerAutoRenewalStatus;
  }

  get cSubscriptionCustomerTransaction() {
    if (this._cSubscriptionCustomerTransaction === undefined) {
      this._cSubscriptionCustomerTransaction = new cSubscriptionCustomerTransaction(
        this.db,
        this
      );
    }
    return this._cSubscriptionCustomerTransaction;
  }

  get cSubscriptionMenuItem() {
    if (this._cSubscriptionMenuItem === undefined) {
      this._cSubscriptionMenuItem = new cSubscriptionMenuItem(
        this.db,
        this
      );
    }
    return this._cSubscriptionMenuItem;
  }

  get cSubscriptionMenuItemOption() {
    if (this._cSubscriptionMenuItemOption === undefined) {
      this._cSubscriptionMenuItemOption = new cSubscriptionMenuItemOption(
        this.db,
        this
      );
    }
    return this._cSubscriptionMenuItemOption;
  }

  get cSubscriptionOrder() {
    if (this._cSubscriptionOrder === undefined) {
      this._cSubscriptionOrder = new cSubscriptionOrder(
        this.db,
        this
      );
    }
    return this._cSubscriptionOrder;
  }

  get cSubscriptionWeeklyOffer() {
    if (this._cSubscriptionWeeklyOffer === undefined) {
      this._cSubscriptionWeeklyOffer = new cSubscriptionWeeklyOffer(
        this.db,
        this
      );
    }
    return this._cSubscriptionWeeklyOffer;
  }

  /* get cSubscriptionBrand() {
    if (this._cSubscriptionBrand === undefined) {
      this._cSubscriptionBrand = new cSubscriptionBrand(
        this.db,
        this
      );
    }
    return this._cSubscriptionBrand;
  } */

  get commonContent() {
    if (this._commonContent === undefined) {
      this._commonContent = new CommonContent(
        this.db,
        this
      );
    }
    return this._commonContent;
  }

  get commonContentCategory() {
    if (this._commonContentCategory === undefined) {
      this._commonContentCategory = new CommonContentCategory(
        this.db,
        this
      );
    }
    return this._commonContentCategory;
  }

  get splashCategory() {
    if (this._splashCategory === undefined) {
      this._splashCategory = new SplashCategory(
        this.db,
        this
      );
    }
    return this._splashCategory;
  }

  get splashCategoryContent() {
    if (this._splashCategoryContent === undefined) {
      this._splashCategoryContent = new SplashCategoryContent(
        this.db,
        this
      );
    }
    return this._splashCategoryContent;
  }

  get homePageSection() {
    if (this._homePageSection === undefined) {
      this._homePageSection = new HomePageSection(
        this.db,
        this
      );
    }
    return this._homePageSection;
  }

  get homePageSectionSetting() {
    if (this._homePageSectionSetting === undefined) {
      this._homePageSectionSetting = new HomePageSectionSetting(
        this.db,
        this
      );
    }
    return this._homePageSectionSetting;
  }

  get borderedCardItem() {
    if (this._borderedCardItem === undefined) {
      this._borderedCardItem = new BorderedCardItem(
        this.db,
        this
      );
    }
    return this._borderedCardItem;
  }

  get cardListItem() {
    if (this._cardListItem === undefined) {
      this._cardListItem = new CardListItem(
        this.db,
        this
      );
    }
    return this._cardListItem;
  }

  get carouselItem() {
    if (this._carouselItem === undefined) {
      this._carouselItem = new CarouselItem(
        this.db,
        this
      );
    }
    return this._carouselItem;
  }

  get carouselItemSetting() {
    if (this._carouselItemSetting === undefined) {
      this._carouselItemSetting = new CarouselItemSetting(
        this.db,
        this
      );
    }
    return this._carouselItemSetting;
  }

  get iconButtonItem() {
    if (this._iconButtonItem === undefined) {
      this._iconButtonItem = new IconButtonItem(
        this.db,
        this
      );
    }
    return this._iconButtonItem;
  }
  get iconButtonItemSetting() {
    if (this._iconButtonItemSetting === undefined) {
      this._iconButtonItemSetting = new IconButtonItemSetting(
        this.db,
        this
      );
    }
    return this._iconButtonItemSetting;
  }

  get filterSet() {
    if (this._filterSet === undefined) {
      this._filterSet = new FilterSet(
        this.db,
        this
      );
    }
    return this._filterSet;
  }

  get tapCustomer() {
    if (this._tapCustomer === undefined) {
      this._tapCustomer = new TapCustomer(
        this.db,
        this
      );
    }
    return this._tapCustomer;
  }

  get stampRewardCustomer() {
    if (this._stampRewardCustomer === undefined) {
      this._stampRewardCustomer = new StampRewardCustomer(
        this.db,
        this
      );
    }
    return this._stampRewardCustomer;
  }

  get stampRewardEligibleItem() {
    if (this._stampRewardEligibleItem === undefined) {
      this._stampRewardEligibleItem = new StampRewardEligibleItem(
        this.db,
        this
      );
    }
    return this._stampRewardEligibleItem;
  }

  get stampRewardRedemptionItem() {
    if (this._stampRewardRedemptionItem === undefined) {
      this._stampRewardRedemptionItem = new StampRewardRedemptionItem(
        this.db,
        this
      );
    }
    return this._stampRewardRedemptionItem;
  }

  get stampRewardLog() {
    if (this._stampRewardLog === undefined) {
      this._stampRewardLog = new StampRewardLog(
        this.db,
        this
      );
    }
    return this._stampRewardLog;
  }
  
  
  skipAuth() {
    const perms = get(this.auth, 'permissions', []);
    // Splitting isTest and Dev User checks so we can log on console but not during tests
    if (isTest || isDev) {
      return true;
    }

    if (this.skipAuthChecks) {
      // Used for internal queries, emails /etc
      return true;
    }

    if (first(perms) === 'dev_override' && env !== 'staging') {
      console.log('checkPermission - DEV USER');
      return true;
    }

    return false;
  }

  checkRole(role, fieldName) {
    const userShallPass = this.hasRole(role);
    if (!userShallPass) {
      SlackWebHookManager.sendTextToSlack(
        `
[!!!PermissionDenied!!!]
Endpoint: ${fieldName ? fieldName : '--internal--'} / ExpectedRole: ${JSON.stringify(role)}
Email: ${this.auth.email} / Id: ${this.auth.id} / IP: ${this.clientIp} / Provider: ${this.auth.authProvider}
RequestId: ${this.requestId}`
      );
      throw new Error('Unauthorized to perform this action');
    }
  }

  hasRole(role) {
    const roles = get(this.auth, 'roles', []);
    return includes(roles, role);
  }

  // Call a model function from within the context of a new transaction
  async withTransaction(model, method, ...args) {
    // Create a transaction object
    return this.db.transaction(trx => {
      // Clone this context but swap in the transaction for the db handle
      const newContext = new QueryContext(
        { handle: trx },
        this.redis,
        this.auth,
        this.pubsub,
        this.schema,
        this.req
      );

      // Copy data loaders' cache so that it can be re-used between transactions and resolvers
      // This is to prevent weird caching issues with mutations
      forEach(this, (model, ix) => {
        if (model) {
          const modelName = ix.replace('_', '');
          if (model.loaders) {
            forEach(newContext[modelName].loaders, (loader, ix) => {
              loader._promiseCache = model.loaders[ix]._promiseCache;
            });
          }
          if (model._idLoader) {
            newContext[modelName]._idLoader._promiseCache =
              model._idLoader._promiseCache;
          }
        }
      });

      // Call the provided model method against the new context
      return newContext[model][method](...args)
        .then(trx.commit)
        .catch(err => {
          const { stack, message } = err || {};
          this.kinesisLogger.sendLogEvent({ stack, message }, 'global-transaction-error');
          console.log('Rolling Back Transaction', err);
          return trx.rollback(err);
        });
    });
  }

  // Performs a graphql query.
  graphql(query, params, skipAuth) {
    let contextValue;
    if (skipAuth) {
      contextValue = new QueryContext(
        { handle: this.db },
        this.redis,
        this.auth,
        this.pubsub,
        this.schema
      );
      contextValue.skipAuthChecks = true;
    } else {
      contextValue = this;
    }

    return graphql({
      schema: this.schema,
      source: query,
      variableValues: params,
      contextValue,
    });
  }
}

module.exports = QueryContext;
