const query = `
query OrderSet($id: ID!) {
  orderSet(id: $id) {
    id
    shortCode
    currentStatus
    customer {
      id
      firstName
    }
    brandLocation {
      brand {
        name {
          en
          ar
        }
      }
    }
    fulfillment {
      id
      type
      note
      time
      asap
      deliverToVehicle
      vehicleColor
      vehicleDescription
      deliveryAddress {
        id
        friendlyName
        block
        street
        avenue
        streetNumber
        type
        floor
        unitNumber
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
