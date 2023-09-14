module.exports = `
query storeOrderSetForCallbacks($id: ID!) {
  storeOrderSetForCallbacks(id: $id) {
    id
    shortCode
    currentStatus
    paid
    total
    subtotal
    fee
    vat
    totalVat
    src
    srcPlatform
    srcPlatformVersion
    created
    fulfillment {
      id
      time
      type
      deliveryEstimate
      deliveryAddress {
        id
        friendlyName
        note
        isDefault
        latitude
        longitude
        type
        block
        street
        street
        floor
        unitNumber
        buildingName
        countryCode
        extraFields {
          id
          name {
            en
            ar
          }
          type
          value
          isRequired
        }
        neighborhood {
          name {
            en
            ar
          }
          city {
            id
            name {
              en
              ar
            }
          }
        }
      }
    }
    storeOrders {
      id
      shortCode
      currentStatus
      statusHistory {
        id
        status
        created
      }
      acknowledged
      total
      brand {
        name {
          en
          ar
        }
      }
      products {
        name {
          en
          ar
        }
        quantity
        price
        totalPrice
        compareAtPrice
        costPerItem
        image
      }
      trackingInfo {
        carrierName
        carrierTrackingId
        carrierTrackingUrl
      }
    }
    payment {
      merchantId
      currentStatus {
        id
        name
      }
    }
    paymentMethod {
      paymentScheme
      name {
        en
        ar
      }
      subText
      sourceId
      imageUrl
    }
    customer {
      id
      firstName
      lastName
      email
      phoneNumber
      preferredLanguage
    }
    computeInvoice {
      components {
        type
        value
      }
    }
    country {
      name {
        en
        ar
      }
      timeZoneIdentifier
      servicePhoneNumber
      isoCode
      vat
      vatId
      hasVat
    }
    currency {
      code {
        en
        ar
      }
      symbol {
        en
        ar
      }
      lowestDenomination
      decimalPlace
    }
  }
}`;
