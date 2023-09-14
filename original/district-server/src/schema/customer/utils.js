function isGuestCustomer(customer) {
  return !customer.authoId;
}
const getExtraFields = async (addressFields, dynamicData) => {
  if (typeof dynamicData === 'object') {
    if (dynamicData === null) dynamicData = {};
  } else {
    try {
      dynamicData = JSON.parse(dynamicData);
    } catch (err) {
      dynamicData = {};
    }
  }
  return addressFields.map(field => {
    return {
      ...field,
      name: field.title,
      value: dynamicData[field.id] ? dynamicData[field.id] : '',
    };
  });
};

module.exports = {
  isGuestCustomer,
  getExtraFields,
};
