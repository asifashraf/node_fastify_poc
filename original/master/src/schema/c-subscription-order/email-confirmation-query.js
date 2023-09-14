module.exports = `
query SubscriptionOrderForCallbacks($id: ID!) {
  subscriptionOrderForCallbacks(id: $id) {
    subscriptionOrder {
      id
      shortCode
      subscriptionId
      total
      subTotal
      customer {
        id
        lastName
        firstName
        phoneNumber
        email
        preferredLanguage
      }
      currency {
        code {
          tr
          ar
          en
        }
        symbol {
          tr
          ar
          en
        }
        lowestDenomination
        decimalPlace
      }
      country {
        id
        name {
          tr
          ar
          en
        }
        vat
        isoCode
        vatId
        hasVat
        servicePhoneNumber
        timeZoneIdentifier
      }
      paymentMethod {
        paymentScheme
        name {
          en
          ar
          tr
        }
        imageUrl
        subText
        sourceId
      }
      paymentProvider
      prePaid {
        creditsUsed
        giftCards {
          value
          id
        }
      }
      refunded
      paid
      updated
      created
      creditsUsed
      vat
      srcPlatformVersion
      srcPlatform
      src
      receiptUrl
      errorUrl
      merchantId
      totalVat
    }
    subscription {
      id
      name {
        ar
        en
        tr
      }
      description {
        ar
        en
        tr
      }
      imageUrl {
        tr
        ar
        en
      }
      period
      totalCupsCount
      perDayCupsCount
      perOrderMaxCupsCount
      price
    }
  }
}`;
