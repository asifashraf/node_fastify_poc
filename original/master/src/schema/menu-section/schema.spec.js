const { fetchGraphQL, getFirstId, testDb } = require('../../lib/test-util');
const {
  menuSectionDetails,
  sampleBrandId,
} = require('../../lib/test-fragments');
const { map, extend } = require('lodash');

test('menus can resolve menu sections', async () => {
  const query = `{
    brand(id: "${sampleBrandId}") {
      menu(countryId:"01c73b60-2c6a-45f1-8dbf-88a5ce4ad179") {
        sections {
          ${menuSectionDetails}
        }
      }
    }
  }`;
  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('menu items can resolve their menu sections', async () => {
  const query = `{
    brand(id: "${sampleBrandId}") {
      menu(countryId:"01c73b60-2c6a-45f1-8dbf-88a5ce4ad179") {
        sections {
          items {
            section {
              ${menuSectionDetails}
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

test('menu sections can be saved', async () => {
  const { id: menuId } = await getFirstId('menus');

  const query = `
    mutation {
      brandMenuSectionSave(menuSections:
      [
        { name: {
          en: "Le Menu Section 1 "
          ar: "لو القائمة القسم 1"
        }, menuId:"${menuId}" }
        { name: {
          en: "Le Menu Section 2 "
          ar: "لو القائمة القسم 2"
        }, menuId:"${menuId}" }
        { name: {
          en: "Le Menu Section 3 "
          ar: "لو القائمة القسم 3"
        }, menuId:"${menuId}" }
       ])
      {
        error
        errors
        menuSections {
          id
          name {
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

test('menu sections can be updated', async () => {
  const { id: menuId } = await getFirstId('menus');

  const sections = map(
    await testDb
      .handle('menu_sections')
      .select('id')
      .where('menu_id', menuId),
    (item, index) => {
      const newItem = extend({}, item, {
        name: {
          en: `Le Menu Section ${index}`,
          ar: `لو القائمة القسم ${index}`,
        },
      });
      return `{ id: "${newItem.id}", name: { en: "${newItem.name.en}", ar: "${newItem.name.ar}"   }, menuId:"${menuId}"}`;
    }
  );

  const query = `
    mutation {
      brandMenuSectionSave(menuSections: [ ${sections} ]
      )
      {
        error
        errors
        menuSections {
          id
          name {
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
