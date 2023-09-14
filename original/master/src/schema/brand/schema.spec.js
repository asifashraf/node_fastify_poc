/* eslint-disable radix */
/* eslint-disable no-await-in-loop */
/* eslint-disable camelcase */
const { fetchGraphQL, getFirstId } = require('../../lib/test-util');
const { find } = require('lodash');
const { brandDetails, sampleMenuId } = require('../../lib/test-fragments');
const { brandLocations } = require('../../../database/seeds/development');

test('get brands', async () => {
  const query = `{
  brands {
    ${brandDetails}
  }
}`;
  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('brand can be saved', async () => {
  const { id: countryId } = await getFirstId('countries');
  const query = `mutation {
  brandSave(brand: {name: {en:"Brand Mutation Test", ar:"اختبار طفرة العلامة التجارية"}, status: ACTIVE, countryId: "${countryId}"}) {
    error
    brand{
      id
      name{
        en
        ar
      }
    }
  }
}`;
  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('brand can be updated', async () => {
  const { id: brandId } = await getFirstId('brands');
  const { id: countryId } = await getFirstId('countries');
  const { id: locationId } = find(
    brandLocations,
    location => location.brand_id === brandId
  );

  const query = `mutation {
    brandSave(brand: {name: {en: "Updated Brand Test", ar:"تحديث اختبار العلامة التجارية" }, status: ACTIVE, countryId: "${countryId}", id: "${brandId}", primaryLocationId: "${locationId}"}) {
      error
      errors
      brand{
        id
        name {
          en
          ar
        }
        primaryLocation { brand {
            name{
              en
              ar
            }
          }
        }
      }
    }
  }`;

  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('menu can resolve brand', async () => {
  const query = `{
    menu(id: "${sampleMenuId}") {
      brand {
        name {
          en
          ar
        }
      }
    }
}  `;
  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('coupon can resolve brands', async () => {
  const { id: couponId } = await getFirstId('coupons');

  const query = `{
    coupon(id:"${couponId}") {
      code
      brands{
        ${brandDetails}
      }
    }
  }`;
  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});
/*
const upd = async () => {
  const { testDb } = require('../../lib/test-util');
  // try {
  const { sync } = require('../../lib/sync-utils');
  const Revel = require('../../lib/revel');
  const revel = new Revel(
    'api-sandbox.revelup.com',
    '1cef7a6ebb9f4a0a9b421f6f60b12962',
    'c0c3c3522cfe4b779464ebc65eba2ee0db4bd78c628c4c5d8cde28b22fa35271'
  );
  const estId = '56';
  const menuId = '75023e9d-5ab3-4d45-8f07-8970d92d0c31';
  const revelCategories = (await revel.readAllData(
    '/products/ProductCategory/',
    {
      active: true,
      establishment: estId,
    }
  )).objects;
  const sections = await sync(
    testDb.handle,
    revelCategories,
    'menu_sections',
    {
      name: 'name',
      nameAr: 'name',
      posId: 'resource_uri',
      sortOrder: 'sorting',
    },
    {
      menuId: [
        {
          source: { establishment: `/enterprise/Establishment/${estId}/` },
          destination: menuId,
        },
      ],
    }
  );
  const revelItems = (await revel.readAllData('/resources/Product/', {
    active: true,
  })).objects;
  const items = await sync(
    testDb.handle,
    revelItems.map(it => {
      return {
        ...it,
        image: it.image ? it.image : ' ',
        itemType: it.type === 0 ? 'DRINK' : 'FOOD',
      };
    }),
    'menu_items',
    {
      name: 'name',
      nameAr: 'name',
      posId: 'resource_uri',
      photo: 'image',
      sortOrder: 'sorting',
    },
    {
      sectionId: sections.data.map(s => {
        return {
          source: { category: s.pos_id },
          destination: s.id,
        };
      }),
    }
  );
  const ProductModifierClass = await revel.readAllData(
    '/resources/ProductModifierClass/',
    {
      active: true,
    }
  );

  const ModifierClass = await revel.readAllData('/resources/ModifierClass/', {
    active: true,
    establishment: estId,
  });
  const modifiers = (await revel.readAllData('/resources/Modifier/', {
    active: true,
  })).objects;
  let revelModifiers = [];
  for (let i = 0; i < ProductModifierClass.objects.length; i++) {
    ProductModifierClass.objects[i].modC = ModifierClass.objects.find(
      m => m.resource_uri === ProductModifierClass.objects[i].modifierclass
    );
    revelModifiers = revelModifiers.concat(
      modifiers
        .filter(
          m => m.modifierClass === ProductModifierClass.objects[i].modifierclass
        )
        .map(m => {
          return {
            ...m,
            pModClass: ProductModifierClass.objects[i].resource_uri,
            resource_uri:
              ProductModifierClass.objects[i].resource_uri +
              '||' +
              m.resource_uri,
          };
        })
    );
  }

  let addedRevelItems = revelItems
    .filter(it => items.data.find(i => i.pos_id === it.resource_uri))
    .map(it => {
      return {
        ...it,
        dbId: items.data.find(i => i.pos_id === it.resource_uri).id,
      };
    });

  const optionSets = await sync(
    testDb.handle,
    ProductModifierClass.objects
      .filter(f => f.modC)
      .map(o => {
        return {
          product: o.product,
          name: o.modC.name,
          sort: o.modC.sort,
          single: false,
          resource_uri: o.resource_uri,
        };
      })
      .concat(
        addedRevelItems.map(i => {
          return {
            product: i.resource_uri,
            name: i.name,
            sort: 0,
            single: true,
            resource_uri: i.resource_uri,
          };
        })
      ),
    'menu_item_option_sets',
    {
      label: 'name',
      labelAr: 'name',
      posId: 'resource_uri',
      single: 'single',
      sortOrder: 'sort',
    },
    {
      menuItemId: items.data
        .map(s => {
          return {
            source: { product: s.pos_id },
            destination: s.id,
          };
        })
        .concat(
          addedRevelItems.map(s => {
            return {
              source: { product: s.resource_uri },
              destination: s.dbId,
            };
          })
        ),
    }
  );

  addedRevelItems = revelItems
    .filter(it => optionSets.data.find(i => i.pos_id === it.resource_uri))
    .map(it => {
      return {
        ...it,
        dbOptionId: optionSets.data.find(i => i.pos_id === it.resource_uri).id,
      };
    });

  await sync(
    testDb.handle,
    revelModifiers
      .map(it => {
        return {
          ...it,
          cost: String(parseFloat(it.price).toFixed(3)),
        };
      })
      .concat(
        addedRevelItems.map(i => {
          return {
            name: i.name,
            cost: String(parseFloat(i.price).toFixed(3)),
            sort: 0,
            pModClass: i.resource_uri,
            resource_uri: i.resource_uri,
          };
        })
      ),
    'menu_item_options',
    {
      value: 'name',
      valueAr: 'name',
      price: 'cost',
      posId: 'resource_uri',
      sortOrder: 'sort',
    },
    {
      menuItemOptionSetId: optionSets.data
        .map(s => {
          return {
            source: { pModClass: s.pos_id },
            destination: s.id,
          };
        })
        .concat(
          addedRevelItems.map(s => {
            return {
              source: { pModClass: s.resource_uri },
              destination: s.dbOptionId,
            };
          })
        ),
    }
  );
  // } catch (err) {
  //   console.log(err.message);
  // }
};
test('revel', async () => {
  await upd(false);

  const { testDb } = require('../../lib/test-util');
  const it1 = await testDb.handle
    .table('menu_item_options')
    .select()
    .whereNotNull('pos_id')
    .andWhere('value', 'add avo');
  console.log(it1);
  // await upd(true);

  // const it2 = await testDb.handle
  //   .table('menu_item_option_sets')
  //   .select()
  //   .whereNotNull('pos_id');
  // console.log(it2.length);
}, 50000);
*/
