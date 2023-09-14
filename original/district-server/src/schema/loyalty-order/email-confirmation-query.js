module.exports = `
query loyaltyOrder($id: ID!) {
  loyaltyOrder(id: $id) {
    id
    sku
    bonus
    amount
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
    payment {
      merchantId
      referenceId
      currentStatus {
        id
        name
      }
    }
    customer {
      id
      lastName
      firstName
      preferredLanguage
    }
    currency {
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
