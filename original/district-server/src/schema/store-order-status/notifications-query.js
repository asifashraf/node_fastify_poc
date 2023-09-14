const query = `
query StoreOrder($id: ID!) {
  storeOrder(id: $id) {
    id
    shortCode
    currentStatus
    brand {
      name {en ar}
    }
    storeOrderSet {
      id
      customer {
        id
        firstName
      }
      payment {
        merchantId
        currentStatus {
          id
          name
        }
      }
    }
    products {
      name {en ar}
    }
  }
}`;

module.exports = id => {
  return {
    query,
    params: { id },
  };
};
