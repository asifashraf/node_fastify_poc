const seeds = require('../../database/seeds/development');

exports.sampleBrandId = seeds.brands.caribou.id;
exports.sampleOrderSetId = seeds.orderSets[0].id;
exports.sampleCustomerId = seeds.customers[0].id;
exports.sampleMenuId = seeds.menus.caribou.id;
exports.sampleBrandLocationId = seeds.brandLocations.caribou1.id;
exports.sampleSaBrandLocationId = seeds.brandLocations.starbucks1.id;

exports.sampleRejectionInfo = {
  reason: 'OUT_OF_STOCK',
  note: 'Rejected by John Doe',
};

/* Brands, Brand Locations and related */

exports.brandDetails = `
  id
  name {
    en
    ar
  }
  locations { id }
`;

exports.brandLocationDetails = `
  id
  phone
  email
  contactName
  heroPhoto
  brand {
    name{
      en
      ar
    }
  }
  createdAt
`;

exports.configurationDetails = `
  defaultLatitude
  defaultLongitude
  deliveryFee
  cofeDistrictHours {
    day
    id
    openTime
  }
  deliveryWindowMin
  deliveryWindowMax
  maxCartSize
  neighborhoods {
    id
  }
  serviceFee
  maxScheduledDeliveries
  loyaltyTiers {
    amount
    name
    colorTint
    bonus
    benefits
    sku
  }
  loyaltyTopUpSku
`;

exports.configurationUpdateDetails = `
  defaultLatitude
  defaultLongitude
  deliveryFee
  deliveryWindowMin
  deliveryWindowMax
  maxCartSize
  serviceFee
  availableDeliveryAreas
`;

exports.neighborhoodDetails = `
  id
  name{
    en
    ar
  }
`;

exports.currencyDetails = `
  id
  name
  symbol {
    en
    ar
  }
  decimalPlace
`;

exports.scheduleExceptionsDetails = `
  id
  isClosed
  isDeliveryClosed
  startTime
  endTime
`;

exports.availableFulfillmentDetails = `
  delivery
  pickup
 `;

exports.weeklyScheduleDetails = `
  id
  day
  openTime
  openDuration
  openAllDay
  deliveryOpenTime
  deliveryOpenDuration
`;

/* Menu and Children */

exports.menuItemDetailsNoAvailability = `
      id
      sections {
        id
        name {
          en
          ar
        }
        items {
          id
          name {
            en
            ar
          }
          itemDescription {
            en
            ar
          }
          baseNutritional {
            calories
            fat
            carbohydrates
            protein
            sugar
            allergens {
              id
              name
            }
          }
          optionSets {
            id
            label {
              en
              ar
            }
            single
            options {
              id
              value {
                en
                ar
              }
              price
            }
          }
          photo
        }
      }
`;

exports.menuDetails = `
      id
      sections {
        id
        name {
          en
          ar
        }
        items {
          id
          name {
            en
            ar
          }
          itemDescription {
            en
            ar
          }
          available(brandLocationId: $brandLocationId)
          baseNutritional {
            calories
            fat
            carbohydrates
            protein
            sugar
            allergens {
              id
              name
            }
          }
          optionSets {
            id
            label {
              en
              ar
            }
            single
            options {
              id
              value {
                en
                ar
              }
              price
            }
          }
          photo
        }
      }
`;

exports.menuSectionDetails = `
  id
  name {
    en
    ar
  }
`;

exports.menuItemDetails = `
  id
  name{
    en
    ar
  }
  photo
  baseNutritional {
    allergens{
      id
      name
    }
  }
`;

exports.menuItemOptionSetDetails = `
  id
  label {
    en
    ar
  }
  single
`;

exports.menuItemOptionDetails = `
  id
  value {
    en
    ar
  }
  price
`;

exports.nutritionalInfoDetails = `
  id
  calories
  fat
  carbohydrates
  sugar
  protein
  allergens {
    id
    name
   }
`;

/* Orders and Children */

exports.orderSetDetails = `
  id
  shortCode
  createdAt
  acknowledged
  note
  subtotal
  total
  internalComments{
    id
    userName
    avatar
    comment
  }
  fee
  coupon { id }
  couponAmount
  fulfillment {
    id
    type
    time
    asap
    courierName
    __typename
  }
  brandLocation {
    id
    name {
      en
      ar
    }
    brand {
      id
      name{
        en
        ar
      }
      __typename
    }
    address {
      id
      street
      __typename
    }
    __typename
  }
  `;

exports.orderDetails = `
  isBeingFulfilled
`;

exports.orderItemDetails = `
  id
  name {
    en
    ar
  }
  quantity
  note
`;

exports.orderItemOptionDetails = `
  id
  value{
    en
    ar
  }
  price
`;

exports.orderStatusDetails = `
  id
  name
  time
  order { id }
`;

exports.orderSetStatusDetails = `
  id
  status
  rejectionReason
  note
`;

exports.orderFulfillmentDetails = `
  id
  type
  time
  note
  deliverToVehicle
  vehicleColor
  vehicleDescription
  asap
  isCustomerPresent
`;

exports.notificationSettingsDetails = `
  smsDeliveryUpdates
  smsPickupUpdates
  pushDeliveryUpdates
  pushPickupUpdates
  newOffers
`;

/* Shared */

exports.couponDetails = `
  id
  code
  createdAt
  startDate
  endDate
  maxLimit
  minApplicableLimit
  redemptionCount
  redemptionLimit
  customerRedemptionLimit
  commission
  customerRedemptionsCount
  isValid
  status
  isValidForThisCustomer
  heroPhoto
  description
  brands{
    id
    name{
      en
    }
  }
  brandLocations{
    id
    name{
      en
    }
  }
  country{
    id
  }
  couponDetails {
    id
    type
    amount
    total
  }
`;

exports.customerCarDetails = `
  id
  isDefault
  name
  color
  brand
  plateNumber
  note
`;

exports.addressDetails = `
  id
  address1
  address2
  city
  province
  country
  zip
  longitude
  latitude
  note
`;

exports.deliveryAddressDetails = `
  id
  friendlyName
  longitude
  latitude
  neighborhoodName
  extraFields{
    id
    name {
      en
      ar
    }
    value
    isRequired
  }
`;

exports.customerAddressDetails = `
  id
  friendlyName
  isDefault
  longitude
  latitude
  neighborhood {
    id
    name{
      en
      ar
    }
  }
  extraFields{
    id
    name {
      en
      ar
    }
    value
    isRequired
  }
`;

exports.brandLocationAddressDetails = `
  street
  city {
    id
    name {
      en
      ar
    }
  }
  longitude
  latitude
`;

exports.orderSetCommentDetails = `
  id
  type
  userId
  userName
  userEmail
  comment
  createdAt
`;

exports.orderPaymentMethodInput = `
{
  id: "2"
  name: {
    en: "VISA/MASTER"
    ar: "فيزا / ماستر"
  }
  serviceCharge: "0"
  totalAmount: "10.000"
  currencyId: "currencyId"
  directPayment: true
  imageUrl: "https://cloudinary-cofeapp.s3.eu-west-1.amazonaws.com/payment-methods/Mastercard.png"
}
`;
