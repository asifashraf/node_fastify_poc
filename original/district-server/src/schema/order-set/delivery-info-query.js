const query = `
query deliveryInfo($id: ID!) {
  orderSet(id: $id) {
    id,
    total,
    brandLocation{
      id
      flickStoreId
    },
    member: customer {
      partnerReferenceID: id
      firstName
      lastName
      phoneCountry
      phoneNumber
    },
    fulfillment {
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
  }
}`;

module.exports = id => {
  return {
    query,
    params: { id },
  };
};
