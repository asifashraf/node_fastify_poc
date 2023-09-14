/* eslint-disable camelcase */
const { appendSortOrderToList } = require('../../../src/lib/util');

module.exports = menus => {
  const menuSections = {
    caribouDrinks: {
      id: '62ee1779-4312-40ee-95c4-7cce956c11ae',
      name: 'Drinks',
      name_ar: 'مشروبات',
      menu_id: menus.caribou.id,
    },
    caribouFood: {
      id: 'ac7a3fe1-5d8d-4f74-984c-eecb7c105adb',
      name: 'Food',
      name_ar: 'طعام',
      menu_id: menus.caribou.id,
    },
    caribouFrozen: {
      id: '6c52f1d1-7d39-41bb-8b0f-6e147183265c',
      name: 'Frozen',
      name_ar: 'مجمد',
      menu_id: menus.caribou.id,
    },
    costaDrinks: {
      id: '9bf7ddac-1508-472b-b283-111b98d89696',
      name: 'Drinks',
      name_ar: 'مشروبات',
      menu_id: menus.costa.id,
    },
    costaFood: {
      id: 'beb0accf-02ff-4120-8803-1f6cf18f3305',
      name: 'Food',
      name_ar: 'طعام',
      menu_id: menus.costa.id,
    },
    costaFrozen: {
      id: 'd9665f58-3627-4e14-a6bc-41b3d106172c',
      name: 'Frozen',
      name_ar: 'مجمد',
      menu_id: menus.costa.id,
    },
    starbucksDrinks: {
      id: '0736292d-d9d6-446f-a2ee-e2ae2e0985d0',
      name: 'Drinks',
      name_ar: 'مشروبات',
      menu_id: menus.starbucks.id,
    },
    starbucksFood: {
      id: '95bedd48-9474-435c-9bae-c396e0b99998',
      name: 'Food',
      name_ar: 'طعام',
      menu_id: menus.starbucks.id,
    },
    starbucksFrozen: {
      id: '135257ff-ab5e-45b2-aaf6-4c0b56f0fc14',
      name: 'Frozen',
      name_ar: 'مجمد',
      menu_id: menus.starbucks.id,
    },
  };

  return appendSortOrderToList(menuSections, 'menu_id', 'sort_order');
};
