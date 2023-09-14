module.exports = function () {
  const decorate = ({ data, brand, menu, brandAdmins }) => {
    return {
      name: data.branch_name,
      currencyId: brand.currencyId,
      brandId: brand.id,
      address: {
        city: 'Dubai',
        cityId: 'b1303293-75ac-4350-ad33-bea98c2f964e', //setting default city to Dubai
        street: data.address,
        latitude: parseFloat(data.latitude || 0),
        longitude: parseFloat(data.longitude || 0),
      },
      contactName: '',
      heroPhoto: '',
      acceptingOrders: false,
      deliveryRadius: 0,
      allowExpressDelivery: false,
      expressDeliveryRadius: 0,
      createdAt: new Date(),
      acceptsCash: false,
      status: 'INACTIVE',
      brandLocationAdmins: [],
    };
  };
  return async function ({ data, dbContext, brand, menu, qContext }) {
    const brandCountry = await qContext.country.getById(brand.countryId);
    const decoratedData = decorate({ data, brand: { ...brand, currencyId: brandCountry.currencyId }, menu });
    const validate = await dbContext.validate(decoratedData);
    const { errors } = validate;
    if (errors && errors.length > 0) {
      console.error('Foodics-Branch-Linker > Errors >', errors);
      throw new Error('Foodics-Branch-Linker Decorator Validation Failed');
    }
    const brandLocationSave = await dbContext.save(decoratedData);
    return {
      message: {
        cofe_brand_location_id: brandLocationSave.brandLocationId,
        ...data,
        entity: 'branch',
      },
      done: true
    };
  };
}();
