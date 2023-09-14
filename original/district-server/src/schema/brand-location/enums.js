exports.brandLocationStoreStatus = {
  STORE_OPEN: 'STORE_OPEN',
  STORE_CLOSED: 'STORE_CLOSED',
  STORE_CLOSING_SOON: 'STORE_CLOSING_SOON',
  SCHEDULING_INCONSISTENCY: 'SCHEDULING_INCONSISTENCY',
};

exports.brandLocationStoreStatusFull = {
  STORE_OPEN: 'STORE_OPEN',
  STORE_CLOSED: 'STORE_CLOSED',
  STORE_CLOSING_SOON: 'STORE_CLOSING_SOON',
  STORE_CLOSED_FOR_PICKUP: 'STORE_CLOSED_FOR_PICKUP',
  STORE_CLOSED_FOR_CAR: 'STORE_CLOSED_FOR_CAR',
  STORE_CLOSED_FOR_DELIVERY: 'STORE_CLOSED_FOR_DELIVERY',
  STORE_CLOSED_FOR_EXPRESS: 'STORE_CLOSED_FOR_EXPRESS',
  STORE_BUSY: 'STORE_BUSY',
  SCHEDULING_INCONSISTENCY: 'SCHEDULING_INCONSISTENCY',
};
exports.BrandLocationReportError = {
  INVALID_BRANCH_LOCATION: 'INVALID_BRANCH_LOCATION',
  NO_WEEKLY_SCHEDULES_FOUND_FOR_BRANCH: 'NO_WEEKLY_SCHEDULES_FOUND_FOR_BRANCH'
};
exports.BrandError = {
  INVALID_BRAND: 'INVALID_BRAND',
};

exports.BrandLocationReportError = {
  INVALID_BRANCH_LOCATION: 'INVALID_BRANCH_LOCATION',
  NO_WEEKLY_SCHEDULES_FOUND_FOR_BRANCH: 'NO_WEEKLY_SCHEDULES_FOUND_FOR_BRANCH'
};
exports.BrandError = {
  INVALID_BRAND: 'INVALID_BRAND',
};

exports.fulFillmentIcons = [
  {
    type: 'PICKUP',
    sortOrder: 1,
    iconUrl: 'https://s3.eu-west-1.amazonaws.com/content.cofeadmin.com/media/shared/homepage/fulfillment_type_icon_active_4.png',
    disableIconUrl: 'https://s3.eu-west-1.amazonaws.com/content.cofeadmin.com/media/shared/homepage/icons/availability_delivery_passive.png'
  },
  {
    type: 'CAR',
    sortOrder: 2,
    iconUrl: 'https://s3.eu-west-1.amazonaws.com/content.cofeadmin.com/media/shared/homepage/fulfillment_type_icon_active_2.png',
    disableIconUrl: 'https://s3.eu-west-1.amazonaws.com/content.cofeadmin.com/media/shared/homepage/icons/availability_curbside_passive.png'
  },
  {
    type: 'DELIVERY',
    sortOrder: 3,
    iconUrl: 'https://s3.eu-west-1.amazonaws.com/content.cofeadmin.com/media/shared/homepage/fulfillment_type_icon_active_1.png',
    disableIconUrl: 'https://s3.eu-west-1.amazonaws.com/content.cofeadmin.com/media/shared/homepage/fulfillment_type_icon_disable_4.png'
  },
  {
    type: 'EXPRESS_DELIVERY',
    sortOrder: 4,
    iconUrl: 'https://s3.eu-west-1.amazonaws.com/content.cofeadmin.com/media/shared/homepage/fulfillment_type_icon_active_3.png',
    disableIconUrl: 'https://s3.eu-west-1.amazonaws.com/content.cofeadmin.com/media/shared/homepage/fulfillment_type_icon_disable_1.png'
  },
];

exports.newFulfillmentTypes = {
  PICKUP: 'PICKUP',
  CAR: 'CAR',
  DELIVERY: 'DELIVERY',
  EXPRESS_DELIVERY: 'EXPRESS_DELIVERY',
};
exports.fulfillmentTypesWithKey = [
  { type: 'PICKUP', name: 'pickup', openAllDay: 'pickupOpenAllDay', scheduleInfo: 'pickupScheduleInfo', availabilityKey: 'pickupEndTime' },
  { type: 'CAR', name: 'car', openAllDay: 'carOpenAllDay', scheduleInfo: 'carScheduleInfo', availabilityKey: 'carEndTime' },
  { type: 'DELIVERY', name: 'delivery', openAllDay: 'deliveryOpenAllDay', scheduleInfo: 'deliveryScheduleInfo', availabilityKey: 'deliveryEndTime' },
  { type: 'EXPRESS_DELIVERY', name: 'expressDelivery', openAllDay: 'expressDeliveryOpenAllDay', scheduleInfo: 'expressDeliveryScheduleInfo', availabilityKey: 'pickupEndTime' }
];

exports.weekDaysTranslate = {
  0: {
    en: 'Sunday',
    ar: 'الأحد',
    tr: 'Pazar',
  },
  1: {
    en: 'Monday',
    ar: 'الاثنين',
    tr: 'Pazartesi',
  },
  2: {
    en: 'Tuesday',
    ar: 'الثلاثاء',
    tr: 'Salı',
  },
  3: {
    en: 'Wednesday',
    ar: 'الأربعاء',
    tr: 'Çarşamba',
  },
  4: {
    en: 'Thursday',
    ar: 'الخميس',
    tr: 'Perşembe',
  },
  5: {
    en: 'Friday',
    ar: 'الجمعة',
    tr: 'Cuma',
  },
  6: {
    en: 'Saturday',
    ar: 'السبت',
    tr: 'Cumartesi',
  }
};

exports.fulFillmentIcons = [
  {
    type: 'PICKUP',
    sortOrder: 1,
    iconUrl: 'https://s3.eu-west-1.amazonaws.com/content.cofeadmin.com/media/shared/homepage/fulfillment_type_icon_active_4.png',
    disableIconUrl: 'https://s3.eu-west-1.amazonaws.com/content.cofeadmin.com/media/shared/homepage/icons/availability_delivery_passive.png'
  },
  {
    type: 'CAR',
    sortOrder: 2,
    iconUrl: 'https://s3.eu-west-1.amazonaws.com/content.cofeadmin.com/media/shared/homepage/fulfillment_type_icon_active_2.png',
    disableIconUrl: 'https://s3.eu-west-1.amazonaws.com/content.cofeadmin.com/media/shared/homepage/icons/availability_curbside_passive.png'
  },
  {
    type: 'DELIVERY',
    sortOrder: 3,
    iconUrl: 'https://s3.eu-west-1.amazonaws.com/content.cofeadmin.com/media/shared/homepage/fulfillment_type_icon_active_1.png',
    disableIconUrl: 'https://s3.eu-west-1.amazonaws.com/content.cofeadmin.com/media/shared/homepage/fulfillment_type_icon_disable_4.png'
  },
  {
    type: 'EXPRESS_DELIVERY',
    sortOrder: 4,
    iconUrl: 'https://s3.eu-west-1.amazonaws.com/content.cofeadmin.com/media/shared/homepage/fulfillment_type_icon_active_3.png',
    disableIconUrl: 'https://s3.eu-west-1.amazonaws.com/content.cofeadmin.com/media/shared/homepage/fulfillment_type_icon_disable_1.png'
  },
];

exports.BrandLocationReportError = {
  INVALID_BRANCH_LOCATION: 'INVALID_BRANCH_LOCATION',
  NO_WEEKLY_SCHEDULES_FOUND_FOR_BRANCH: 'NO_WEEKLY_SCHEDULES_FOUND_FOR_BRANCH'
};
exports.BrandError = {
  INVALID_BRAND: 'INVALID_BRAND',
};

exports.fulFillmentIcons = [
  {
    type: 'PICKUP',
    sortOrder: 1,
    iconUrl: 'https://s3.eu-west-1.amazonaws.com/content.cofeadmin.com/media/shared/homepage/fulfillment_type_icon_active_4.png',
    disableIconUrl: 'https://s3.eu-west-1.amazonaws.com/content.cofeadmin.com/media/shared/homepage/icons/availability_delivery_passive.png'
  },
  {
    type: 'CAR',
    sortOrder: 2,
    iconUrl: 'https://s3.eu-west-1.amazonaws.com/content.cofeadmin.com/media/shared/homepage/fulfillment_type_icon_active_2.png',
    disableIconUrl: 'https://s3.eu-west-1.amazonaws.com/content.cofeadmin.com/media/shared/homepage/icons/availability_curbside_passive.png'
  },
  {
    type: 'DELIVERY',
    sortOrder: 3,
    iconUrl: 'https://s3.eu-west-1.amazonaws.com/content.cofeadmin.com/media/shared/homepage/fulfillment_type_icon_active_1.png',
    disableIconUrl: 'https://s3.eu-west-1.amazonaws.com/content.cofeadmin.com/media/shared/homepage/fulfillment_type_icon_disable_4.png'
  },
  {
    type: 'EXPRESS_DELIVERY',
    sortOrder: 4,
    iconUrl: 'https://s3.eu-west-1.amazonaws.com/content.cofeadmin.com/media/shared/homepage/fulfillment_type_icon_active_3.png',
    disableIconUrl: 'https://s3.eu-west-1.amazonaws.com/content.cofeadmin.com/media/shared/homepage/fulfillment_type_icon_disable_1.png'
  },
];

exports.newFulfillmentTypes = {
  PICKUP: 'PICKUP',
  CAR: 'CAR',
  DELIVERY: 'DELIVERY',
  EXPRESS_DELIVERY: 'EXPRESS_DELIVERY',
};
exports.fulfillmentTypesWithKey = [
  { type: 'PICKUP', name: 'pickup', openAllDay: 'pickupOpenAllDay', scheduleInfo: 'pickupScheduleInfo', availabilityKey: 'pickupEndTime', enableKey: 'hasPickup' },
  { type: 'CAR', name: 'car', openAllDay: 'carOpenAllDay', scheduleInfo: 'carScheduleInfo', availabilityKey: 'carEndTime', enableKey: 'allowDeliverToCar' },
  { type: 'DELIVERY', name: 'delivery', openAllDay: 'deliveryOpenAllDay', scheduleInfo: 'deliveryScheduleInfo', availabilityKey: 'deliveryEndTime', enableKey: 'hasDelivery' },
  { type: 'EXPRESS_DELIVERY', name: 'expressDelivery', openAllDay: 'expressDeliveryOpenAllDay', scheduleInfo: 'expressDeliveryScheduleInfo', availabilityKey: 'pickupEndTime', enableKey: 'allowExpressDelivery' }
];

exports.weekDaysTranslate = {
  0: {
    en: 'Sunday',
    ar: 'الأحد',
    tr: 'Pazar',
  },
  1: {
    en: 'Monday',
    ar: 'الاثنين',
    tr: 'Pazartesi',
  },
  2: {
    en: 'Tuesday',
    ar: 'الثلاثاء',
    tr: 'Salı',
  },
  3: {
    en: 'Wednesday',
    ar: 'الأربعاء',
    tr: 'Çarşamba',
  },
  4: {
    en: 'Thursday',
    ar: 'الخميس',
    tr: 'Perşembe',
  },
  5: {
    en: 'Friday',
    ar: 'الجمعة',
    tr: 'Cuma',
  },
  6: {
    en: 'Saturday',
    ar: 'السبت',
    tr: 'Cumartesi',
  }
};

exports.fulFillmentIcons = [
  {
    type: 'PICKUP',
    sortOrder: 1,
    iconUrl: 'https://s3.eu-west-1.amazonaws.com/content.cofeadmin.com/media/shared/homepage/icon_pickup_active.png',
    disableIconUrl: 'https://s3.eu-west-1.amazonaws.com/content.cofeadmin.com/media/shared/homepage/icon_pickup_disable.png',
  },
  {
    type: 'CAR',
    sortOrder: 2,
    iconUrl: 'https://s3.eu-west-1.amazonaws.com/content.cofeadmin.com/media/shared/homepage/icon_car_active.png',
    disableIconUrl: 'https://s3.eu-west-1.amazonaws.com/content.cofeadmin.com/media/shared/homepage/icon_car_disable.png',
  },
  {
    type: 'DELIVERY',
    sortOrder: 3,
    iconUrl: 'https://s3.eu-west-1.amazonaws.com/content.cofeadmin.com/media/shared/homepage/icon_delivery_active.png',
    disableIconUrl: 'https://s3.eu-west-1.amazonaws.com/content.cofeadmin.com/media/shared/homepage/icon_delivery_disable.png',
  },
  {
    type: 'EXPRESS_DELIVERY',
    sortOrder: 4,
    iconUrl: 'https://s3.eu-west-1.amazonaws.com/content.cofeadmin.com/media/shared/homepage/icon_10_minutes_active.png',
    disableIconUrl: 'https://s3.eu-west-1.amazonaws.com/content.cofeadmin.com/media/shared/homepage/icon_10_minutes_disable.png',
  },
];

exports.brandLocationReportError = {
  INVALID_BRAND_LOCATION: 'INVALID_BRAND_LOCATION',
  NO_WEEKLY_SCHEDULES_FOUND_FOR_BRANCH: 'NO_WEEKLY_SCHEDULES_FOUND_FOR_BRANCH'
};
