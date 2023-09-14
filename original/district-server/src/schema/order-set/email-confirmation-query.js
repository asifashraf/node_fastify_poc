module.exports = `
query orderSetForCallbacks($id: ID!) {
  orderSetForCallbacks(id: $id) {
    id
    shortCode
    fee
    currentStatus
    coupon {
      code
    }
    paymentMethod {
      imageUrl
      paymentScheme
      sourceId
      subText
      name {
        en
        ar
      }
    }
    couponAmount
    statusHistory {
      id
      status
      createdAt
      rejectionReason
      note
    }
    acknowledged
    subtotal
    total
    createdAt
    note
    internalComments{
      id
      created
      userName
      avatar
      comment
    }
    customer {
      id
      firstName
      lastName
      email
      phoneNumber
      preferredLanguage
    }
    brandLocation {
      id
      timeZoneIdentifier
      name {
        en
        ar
      }
      brand {
        id
        name {
          en
          ar
        }
        country {
          vat
          vatId
          hasVat
        }
      }
    }
    fulfillment {
      id
      type
      time
      asap
      courierName
      deliverToVehicle
      vehicleColor
      vehicleDescription
      deliveryAddress {
        name: friendlyName
        partnerReferenceID: id
        note
        block
        street
        avenue
        neighborhoodName
        streetNumber
        type
        floor
        unitNumber
        latitude
        longitude
        countryCode
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
      }
    }
    items {
      id
      quantity
      name {
        en
        ar
      }
      note
      selectedOptions {
        id
        value{
          en
          ar
        }
        price
      }
    }
    currency {
      symbol {
        en
        ar
      }
      lowestDenomination
      decimalPlace
      country {
        id
        servicePhoneNumber
      }
    }
    computeInvoice {
      components {
        type
        value
      }
    }
  }
}`;
