const { addLocalizationField } = require('../../lib/util');
const { addressFieldType } = require('../root/enums');
module.exports = {
  CustomerAddress: {
    async neighborhood({ neighborhoodId }, args, context) {
      const n = await context.neighborhood.getById(neighborhoodId);
      if (n) {
        return addLocalizationField(n, 'name');
      }
      // added mocked response.
      return {
        id: '49a53d7f-7121-4a63-a0b7-4f599f1c4543',
        name: {
          en: '',
          ar: '',
        },
        status: 'INACTIVE',
      };
    },
    asString({extraFields}, args, context) {
      /**
       * TODO: there should be an address template for each country.
       * With this way, we would show correct address fields with
       * a country-specific address writing schema.
       */
      const street = extraFields.find(t => t.type === addressFieldType.STREET);
      const buildingName = extraFields.find(t => t.type === addressFieldType.BUILDING_NAME);
      const floor = extraFields.find(t => t.type === addressFieldType.FLOOR);
      const unitNumber = extraFields.find(t => t.type === addressFieldType.UNIT_NUMBER);
      const components = [street?.value, buildingName?.value, floor?.value, unitNumber?.value];
      return components.filter(t => !!t).flat().join(', ');
    }
  },
};
