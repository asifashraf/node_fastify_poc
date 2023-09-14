const {
  fetchGraphQL,
  // openInGraphiql,
} = require('../../lib/test-util');
const seeds = require('../../../database/seeds/development');

// test('customer can be Registered', async () => {
//   const query = `mutation {
//      customerRegister(customer:{firstName:"Linus",lastName:"Torvalds",email:"linux@gmail.com"})
//       {
//         error
//         customer {
//           id
//           firstName
//         }
//       }
//     }`;
//   const vars = { __user: { id: 'newuser' } };
//   // openInGraphiql(query, vars);
//   const result = await fetchGraphQL(query, vars);
//   expect(result).toMatchSnapshot();
// });

// test('customer registrations validations ', async () => {
//   const query = `mutation {
//      customerRegister(customer:{firstName:"NotImportant",lastName:"NotImportant",email:"frodo.baggins@hobitton.ts"})
//       {
//         error
//         customer {
//           id
//           firstName
//         }
//       }
//     }`;

//   // openInGraphiql(query);
//   const result = await fetchGraphQL(query, {
//     __user: { id: seeds.customers[1].id },
//   });
//   expect(result).toMatchSnapshot();
// });

test('customer can be Updated', async () => {
  const query = `mutation {
     customerUpdate(customer:{firstName:"Linus",lastName:"Torvalds",phoneNumber:"01010101",phoneCountry:"US"
     isPhoneVerified: false,
     isEmailVerified: true,
     email: "test@test.com"
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
        }
      }
    }`;

  // openInGraphiql(query);
  const result = await fetchGraphQL(query, {
    __user: { id: seeds.customers[1].id },
  });
  expect(result).toMatchSnapshot();
});

test('customer update validations ', async () => {
  const query = `mutation {
     customerUpdate(customer:{firstName:"Linus",lastName:"Torvalds",phoneNumber:"01010101",phoneCountry:"US"
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
        }
      }
    }`;

  // openInGraphiql(query);
  const result = await fetchGraphQL(query, {
    __user: { id: 'i_do_not_exist' },
  });
  expect(result).toMatchSnapshot();
});

test('customer can be retrieved by auth', async () => {
  const query = `query {
  customerByAuth {
    id
    firstName
    lastName
    totalKdSpent
    totalOrders
  }
  }`;

  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('customer can resolve its credit balance', async () => {
  const { currencies } = seeds;
  const query = `query {
  customerByAuth {
    id
    firstName
    lastName
    creditBalance(currencyId: "${currencies.kd.id}")
    totalKdSpent
    totalOrders
    }
  }`;

  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('customers can be retrieved with paging and by Loyalty Tier', async () => {
  const query = `{
    customers(paging:{limit:10,offset:1},loyaltyTierName:GREEN) {
      id
      lastName
      firstName
      loyaltyTier
      totalKdSpent
      totalOrders
    }
  }
`;
  // openInGraphiql(query, vars);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('customers can be retrieved by search term', async () => {
  const query = `{
    customers(searchTerm:"fro") {
      id
      lastName
      firstName
      loyaltyTier
    }
    }
`;
  // openInGraphiql(query, vars);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('customer can resolve wallet', async () => {
  const query = `{
    customerByAuth {
      id
      firstName
      lastName
      wallet {
        accounts {
          total
          currency {
            id
          }
        }
      }
    }
  }`;

  const {
    data: { customerByAuth },
  } = await fetchGraphQL(query);
  expect(customerByAuth.wallet).not.toBeNull();
  expect(customerByAuth.wallet.accounts.length).toBeGreaterThan(0);
  customerByAuth.wallet.accounts.map(account => {
    expect(account).toHaveProperty('total');
    expect(account).toHaveProperty('currency.id');
    return account;
  });
});

test('customer can resolve his saved card tokens', async () => {
  const query = `{
    customerByAuth {
      cardTokens {
        id
      }
    }
  }`;

  const {
    data: { customerByAuth },
  } = await fetchGraphQL(query);
  expect(customerByAuth.cardTokens.length).toBeGreaterThan(0);
  customerByAuth.cardTokens.map(cardToken => {
    return expect(cardToken).toHaveProperty('id');
  });
});
