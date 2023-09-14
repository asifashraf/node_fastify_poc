const casual = require('casual');
const { fetchGraphQL } = require('../../lib/test-util');
const seeds = require('../../../database/seeds/development');
// const db = require('../../../database/');

describe('customers schema tests', () => {
  test('customer can update preferred language', async () => {
    const query = `mutation {
     customerUpdate(customer:{firstName:"Linus",lastName:"Torvalds",phoneNumber:"01010101",phoneCountry:"US"
      preferredLanguage: AR
      notificationSettings: {
        smsPickupUpdates:false
        smsDeliveryUpdates:false
        pushDeliveryUpdates:true
        pushPickupUpdates:true
        newOffers: false
      }
     })
      {
        error
        customer {
          id
          firstName
          preferredLanguage
        }
      }
    }`;

    const {
      data: {
        customerUpdate: { customer },
      },
    } = await fetchGraphQL(query, {
      __user: { id: seeds.customers[1].id },
    });
    expect(customer).toHaveProperty('preferredLanguage', 'AR');
  });

  test('can register a guest customer', async () => {
    const firstName = casual.first_name;
    const lastName = casual.last_name;
    const query = `mutation {
      guestCustomerRegister(customer: {
        firstName: "${firstName}"
        lastName: "${lastName}"
        phoneNumber: "11111"
      }) {
        customer {
          id
          firstName
          lastName
          phoneNumber
          phoneCountry
        }
      }
    }`;
    const {
      data: {
        guestCustomerRegister: { customer },
      },
    } = await fetchGraphQL(query);
    expect(customer).toHaveProperty('firstName', firstName);
    expect(customer).toHaveProperty('lastName', lastName);
    expect(customer).toHaveProperty('phoneCountry', 'KW');
  });

  // test('can upgrade a guest customer to full customer', async () => {
  //   const c = await db('customers').where(
  //     'id',
  //     '6a3e7e22-69ed-4bc1-99db-f255a3382416'
  //   );
  //   const object = {
  //     firstName: 'Tobe',
  //     lastName: 'Upgraded',
  //     phoneNumber: '121121',
  //     phoneCountry: 'KW',
  //     isPhoneVerified: true,
  //   };
  //   if (c) {
  //     await db('customers')
  //       .update(object)
  //       .where('id', '6a3e7e22-69ed-4bc1-99db-f255a3382416');
  //   } else {
  //     await db('customers').insert({
  //       ...object,
  //       ...{ id: '6a3e7e22-69ed-4bc1-99db-f255a3382416' },
  //     });
  //   }

  //   const firstName = casual.first_name;
  //   const lastName = casual.last_name;
  //   const query = `mutation{
  //     customerRegister(customer: {
  //       firstName: "${firstName}",
  //       lastName: "${lastName}",
  //       email: "guesttofull@mail.ts",
  //       phoneNumber: "121121",
  //     }) {
  //       customer{
  //         id
  //         firstName
  //         lastName
  //         phoneNumber
  //         authoId
  //       }
  //     }
  //   }`;

  //   const {
  //     data: {
  //       customerRegister: { customer },
  //     },
  //   } = await fetchGraphQL(query, { __user: { id: 'autho|id-from-autho' } });
  //   expect(customer).toHaveProperty('authoId', 'autho|id-from-autho');
  //   // expect(customer).toHaveProperty(
  //   //   'id',
  //   //   '6a3e7e22-69ed-4bc1-99db-f255a3382416'
  //   // );
  // });
});
