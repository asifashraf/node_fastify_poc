const { fetchGraphQL, getFirstId, testDb } = require('../../lib/test-util');
const { first } = require('lodash');
const {
  dairy,
  egg,
  fish,
  gluten,
} = require('../../../database/seeds/development').allergens;

test('items can be set as unavailable for brand Location', async () => {
  const { id: brandLocationId } = await getFirstId('brand_locations');
  const { id: menuItemId } = await getFirstId('menu_items');

  const query = `mutation{
  brandLocationSetUnavailableMenuItem(menuItemId:"${menuItemId}",brandLocationId:"${brandLocationId}"){
    menuItem {
      id
      available(brandLocationId:"20d56f80-a6de-45ee-84e1-d49f613c7fd4")
    }
    error
    errors
  }
}
  `;
  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('item availability can be checked', async () => {
  const { id: brandLocationId } = await getFirstId('brand_locations');

  const query = `{
   brandLocation(id:"${brandLocationId}") {
    menu{
      sections{
        items{
          available(brandLocationId:"${brandLocationId}"),
          id
        }
      }
    }
  }
  }
`;
  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('menu item can be created', async () => {
  const { id: sectionId } = await getFirstId('menu_sections');

  const query = `mutation
                  {
                    brandMenuItemSave(
                      menuItems:
                        [{
                          name: {
                            en: "Test Menu Item",
                            ar: "اختبار القائمة البند"
                          },
                          itemDescription: {
                            en: "Menu item Description - en",
                            ar: "Menu item Description - ar"
                          },
                          sectionId:"${sectionId}"
                          photo:"https://pbs.twimg.com/profile_images/877601376464904192/b3jangc1.jpg"
                          baseNutritional:  {
                            calories: 10
                            fat: 1
                            sugar: 2
                            protein: 3
                            carbohydrates: 4
                            allergens: ["${dairy.id}","${egg.id}"]
                          }
                          optionSets:
                            [
                              {
                                label: {
                                  en: "Size",
                                  ar: "بحجم"
                                }
                                single: true
                                options:
                                  [
                                    {
                                      value: {
                                        en: "Big",
                                        ar: "كبير"
                                      }
                                      price: "10"
                                    },
                                    {
                                      value: {
                                        en: "Small",
                                        ar: "صغير"
                                      }
                                      price:"7"
                                    }
                                  ]
                              },
                              {
                                label: {
                                  en: "Temperature: Cold",
                                  ar: "درجة الحرارة: بارد"
                                }
                                single: false
                                options:
                                  [
                                    {
                                      value: {
                                        en: "Small",
                                        ar: "صغير"
                                      }
                                      price: "14"
                                    },
                                    {
                                      value: {
                                        en: "Medium",
                                        ar: "متوسط"
                                      }
                                      price: "15"
                                    },
                                    {
                                      value: {
                                        en: "Large",
                                        ar: "كبير"
                                      }
                                      price: "14"
                                    }
                                  ]
                              }
                            ]
                        }]
                    )
                    {
                      error
                      errors
                      menuItems {
                        name {
                          en
                          ar
                        }
                        photo
                        optionSets
                          {
                            label {
                              en
                              ar
                            }
                            sortOrder
                            options
                              {
                                value {
                                  en
                                  ar
                                }
                                price
                                sortOrder
                              }
                          }
                      }
                    }
                  }
`;
  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('menu item can be updated ', async () => {
  const { id: menuItemId } = await getFirstId('menu_items');
  const { id: sectionId } = await getFirstId('menu_sections');
  const { id: menuItemOptionSetId } = await testDb
    .handle('menu_item_option_sets')
    .where('menu_item_id', menuItemId)
    .select('id')
    .limit(1)
    .then(first);
  const { baseNutritionalId } = await testDb
    .handle('menu_items')
    .where('id', menuItemId)
    .select('base_nutritional_id')
    .limit(1)
    .then(first);

  const query = `mutation
                  {
                    brandMenuItemSave(
                      menuItems:
                        [{
                          id: "${menuItemId}"
                          name: {
                            en: "Test Menu Item",
                            ar: "اختبار القائمة البند"
                          },
                          sectionId:"${sectionId}"
                          itemDescription: {
                            en: "Menu item Description - en",
                            ar: "Menu item Description - ar"
                          },
                          photo:"https://pbs.twimg.com/profile_images/877601376464904192/b3jangc1.jpg"
                          baseNutritional:  {
                            id: "${baseNutritionalId}"
                            calories: 10
                            fat: 1
                            sugar: 2
                            protein: 3
                            carbohydrates: 4
                            allergens: ["${fish.id}","${gluten.id}"]
                          }
                          optionSets:
                            [
                              {
                                id: "${menuItemOptionSetId}"
                                label: {
                                  en: "Size",
                                  ar: "بحجم"
                                }
                                single: true
                                options:
                                  [
                                    {
                                      value: {
                                        en: "Big",
                                        ar: "كبير"
                                      }
                                      price: "10"
                                    },
                                    {
                                      value: {
                                        en: "Small",
                                        ar: "صغير"
                                      }
                                      price:"7"
                                    }
                                  ]
                              },
                              {
                                label: {
                                  en: "Temperature: Cold",
                                  ar: "درجة الحرارة: بارد"
                                }
                                single: false
                                options:
                                  [
                                    {
                                      value: {
                                        en: "Small",
                                        ar: "صغير"
                                      }
                                      price: "14"
                                    },
                                    {
                                      value: {
                                        en: "Medium",
                                        ar: "متوسط"
                                      }
                                      price: "15"
                                    },
                                    {
                                      value: {
                                        en: "Large",
                                        ar: "كبير"
                                      }
                                      price: "14"
                                    }
                                  ]
                              }
                            ]
                        }]
                    )
                    {
                     error
                      errors
                      menuItems {
                        name {
                          en
                          ar
                        }
                        photo
                        optionSets
                          {
                            label{
                              en
                              ar
                            }
                            options
                              {
                                value {
                                  en
                                  ar
                                }
                                price
                              }
                          }
                      }
                    }
                  }
`;
  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});
