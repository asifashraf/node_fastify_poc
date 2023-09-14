module.exports = `
  query giftCardOrderForCallbacks($id: ID!) {
    giftCardOrderForCallbacks(id: $id) {
      id
      shortCode
      amount
      receiverEmail
      receiverName
      message
      anonymousSender
      deliveryMethod
      giftCardTemplate {
        id
        brand {
          id
          name {
            en
            ar
          }
        }
      }
      giftCard {
        id
        imageUrl {
          en
          ar
        }
        shareUrl
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
      customer {
        id
        email
        firstName
        lastName
        phoneNumber
        preferredLanguage
      }
      currency {
        id
        lowestDenomination
        decimalPlace
        symbol {
          en
          ar
        }
        country {
          id
          servicePhoneNumber
        }
      }
    }
  }
`;
