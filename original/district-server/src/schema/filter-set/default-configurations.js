const filterItemTypes = {
  TOGGLE: 'TOGGLE',
  SELECT: 'SELECT',
  CHECKBOX: 'CHECKBOX',
  MULTI_CHECKBOX: 'MULTI_CHECKBOX',
};

const filterItemValueTypes = {
  BOOLEAN: 'BOOLEAN',
  STRING: 'STRING',
  NUMBER: 'NUMBER',
};

exports.defaultFilterValuesByCountryId = [
  {
    countryIds: [
      '9ef3e7ae-0f82-45ce-b67f-a9b5dfc49d5c',
      '47beceb7-b623-44dd-a037-8a9f62da935c',
      '01c73b60-2c6a-45f1-8dbf-88a5ce4ad179',
      'ff0a4c42-728b-45a5-9381-73fcbbaf873c'
    ],
    name: {
      en: 'Offers',
      ar: 'Offers'
    },
    type: filterItemTypes.TOGGLE,
    allowMultiSelect: false,
    optionValues: [
      {
        label: null,
        value: 'false',
        type: filterItemValueTypes.BOOLEAN,
      }
    ]
  },
  {
    countryIds: [
      '9ef3e7ae-0f82-45ce-b67f-a9b5dfc49d5c',
      '47beceb7-b623-44dd-a037-8a9f62da935c',
      '01c73b60-2c6a-45f1-8dbf-88a5ce4ad179',
      'ff0a4c42-728b-45a5-9381-73fcbbaf873c'
    ],
    name: {
      en: 'Free Delivery',
      ar: 'Free Delivery'
    },
    type: filterItemTypes.TOGGLE,
    allowMultiSelect: false,
    optionValues: [
      {
        label: null,
        value: 'false',
        type: filterItemValueTypes.BOOLEAN
      }
    ]
  },
  {
    countryIds: [
      '9ef3e7ae-0f82-45ce-b67f-a9b5dfc49d5c',
      '47beceb7-b623-44dd-a037-8a9f62da935c',
      '01c73b60-2c6a-45f1-8dbf-88a5ce4ad179',
      'ff0a4c42-728b-45a5-9381-73fcbbaf873c'
    ],
    name: {
      en: 'Star rating',
      ar: 'Star rating'
    },
    type: filterItemTypes.MULTI_CHECKBOX,
    allowMultiSelect: true,
    optionValues: [
      {
        label: {
          en: '5 stars',
          ar: '5 stars'
        },
        value: 'false',
        type: filterItemValueTypes.BOOLEAN
      },
      {
        label: {
          en: '4 stars',
          ar: '4 stars'
        },
        value: 'false',
        type: filterItemValueTypes.BOOLEAN
      },
      {
        label: {
          en: '3 stars',
          ar: '3 stars'
        },
        value: 'false',
        type: filterItemValueTypes.BOOLEAN
      },
      {
        label: {
          en: '2 stars',
          ar: '2 stars'
        },
        value: 'false',
        type: filterItemValueTypes.BOOLEAN
      },
      /*
      {
        label: {
          en: "1 stars",
          ar: "1 stars"
        },
        value: "false",
        type: filterItemValueTypes.BOOLEAN
      },
      */
    ]
  }
];
