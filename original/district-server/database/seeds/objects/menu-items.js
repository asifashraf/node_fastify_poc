/* eslint-disable camelcase */
const { menuItemType } = require('../../../src/schema/root/enums');
const { appendSortOrderToList } = require('../../../src/lib/util');
const { map, mapValues, extend } = require('lodash');

module.exports = (sections, nutritionalInfos) => {
  const menuItems = {
    caribouColdBrew: {
      id: '1902b625-d495-4d8c-8265-e0c53a57eef0',
      name: 'Cold Brew',
      name_ar: 'المشروب البارد',
      item_description: 'Cold press coffee made with our rich house blend.',
      item_description_ar:
        'القهوة الباردة الصحافة المصنوعة من مزيج منزلنا الغنية.',
      photo:
        'https://cofe-district.imgix.net/development/menu-item/menu-item-1517011821414.jpeg',
      section_id: sections.caribouDrinks.id,
      type: menuItemType.DRINK,
    },
    caribouAmericano: {
      id: '69a8f735-3f7d-44fa-8a82-edcd16f33308',
      name: 'Long Black Americano',
      name_ar: 'طويل أسود أمريكانو',
      item_description: 'Double-shot poured over our hot filtered water.',
      item_description_ar: 'سكب مزدوج على المياه الساخنة المصفاة.',
      photo:
        'https://cofe-district.imgix.net/development/menu-item/menu-item-1517011886548.jpeg',
      section_id: sections.caribouDrinks.id,
      type: menuItemType.DRINK,
    },
    caribouFilterBrew: {
      id: '4d255e11-5250-4ab8-9085-0ac07d3b26a3',
      name: 'Filter Brew',
      name_ar: 'مرشح المشروب',
      item_description:
        'Not just any standard coffee. We thoughtfully choose our regular and seasonal coffees and brew every hour to ensure maximum freshness.',
      item_description_ar:
        'ليس فقط أي القهوة القياسية. نختار بعناية القهوة العادية والموسمية ونحضر كل ساعة لضمان أقصى نضارة.',
      photo:
        'https://cofe-district.imgix.net/development/menu-item/menu-item-1517011917597.jpg',
      section_id: sections.caribouDrinks.id,
      type: menuItemType.DRINK,
    },
    caribouSandwich: {
      id: '6e3e377a-aca8-44ca-b70c-214f862d8dfe',
      name: 'Deli Sandwich',
      name_ar: 'ديلي ساندويتش',
      item_description:
        'Delicious sandwich with only the finest selection from our deli.',
      item_description_ar: 'شطيرة لذيذة مع فقط أفضل تشكيلة من ديلي لدينا.',
      photo:
        'https://cofe-district.imgix.net/development/menu-item/menu-item-1517011951653.jpg',
      section_id: sections.caribouFood.id,
      type: menuItemType.FOOD,
    },
    caribouCookie: {
      id: '0837b2c8-2ec2-4509-af13-d05b6e7b797f',
      name: 'Large Cookie',
      name_ar: 'كوكي كبير',
      item_description: 'Fresh from the bakery.',
      item_description_ar: 'طازجة من المخبز.',
      photo:
        'https://cofe-district.imgix.net/development/menu-item/menu-item-1517011982488.jpg',
      section_id: sections.caribouFood.id,
      type: menuItemType.FOOD,
    },
    caribouSoup: {
      id: '7a2ad1d2-cf54-4495-af15-85b94a4224b5',
      name: 'Homemade Soup',
      name_ar: 'شوربة محلية الصنع',
      item_description: 'Deliciously home made soup.',
      item_description_ar: 'حساء المنزل لذيذ أدلى.',
      photo:
        'https://cofe-district.imgix.net/development/menu-item/menu-item-1517012025725.jpg',
      section_id: sections.caribouFood.id,
      type: menuItemType.FOOD,
    },
    caribouCaramelJelly: {
      id: 'b91b2161-c8c9-4029-b9ad-a8f80ce41c93',
      name: 'Caramel Jelly',
      name_ar: 'كراميل جيلي',
      item_description:
        'Frozen coffee with milk and caramel topped with whipped cream and chocolate syrup.',
      item_description_ar:
        'قهوة مجمدة مع الحليب والكراميل مع الكريما المخفوقة وشراب الشوكولاتة.',
      photo:
        'https://cofe-district.imgix.net/development/menu-item/menu-item-1517012071484.jpg',
      section_id: sections.caribouFrozen.id,
      type: menuItemType.FOOD,
    },
    caribouChocoBanana: {
      id: '87f26eb8-ed27-45df-81e9-2a33c56cb052',
      name: 'Choco Banana',
      name_ar: 'شوكو موز',
      item_description:
        'Frozen coffee with milk topped with whipped cream and chocolate syrup.',
      item_description_ar:
        'قهوة مجمدة مع حليب مغطى بالكريمة المخفوقة وشراب الشوكولاتة.',
      photo:
        'https://cofe-district.imgix.net/development/menu-item/menu-item-1517012105997.jpeg',
      section_id: sections.caribouFrozen.id,
      type: menuItemType.FOOD,
    },
    costaColdBrew: {
      id: 'e209a4a7-f492-44d2-8309-ad81af77ac19',
      name: 'Cold Brew',
      name_ar: 'الشراب البارد',
      item_description: 'Cold press coffee made with our rich house blend.',
      item_description_ar:
        'القهوة الباردة الصحافة المصنوعة من مزيج منزلنا الغنية.',
      photo:
        'https://cofe-district.imgix.net/development/menu-item/menu-item-1517012144708.jpeg',
      section_id: sections.costaDrinks.id,
      type: menuItemType.DRINK,
    },
    costaAmericano: {
      id: '25dfa457-5558-4267-9955-0efbdcb45aff',
      name: 'Long Black Americano',
      name_ar: 'طويل أسود أمريكانو',
      item_description: 'Double-shot poured over our hot filtered water.',
      item_description_ar: 'سكب مزدوج على المياه الساخنة المصفاة.',
      photo:
        'https://cofe-district.imgix.net/development/menu-item/menu-item-1517012207848.jpg',
      section_id: sections.costaDrinks.id,
      type: menuItemType.DRINK,
    },
    costaFilterBrew: {
      id: '3e3027cb-6f45-405f-bb60-fe2a5103e110',
      name: 'Filter Brew',
      name_ar: 'مرشح المشروب',
      item_description:
        'Not just any standard coffee. We thoughtfully choose our regular and seasonal coffees and brew every hour to ensure maximum freshness.',
      item_description_ar:
        'ليس فقط أي القهوة القياسية. نختار بعناية القهوة العادية والموسمية ونحضر كل ساعة لضمان أقصى نضارة.',
      photo:
        'https://cofe-district.imgix.net/development/menu-item/menu-item-1517012245975.jpg',
      section_id: sections.costaDrinks.id,
      type: menuItemType.DRINK,
    },
    costaSandwich: {
      id: '3851e1da-d1be-492d-855c-aec20f051639',
      name: 'Deli Sandwich',
      name_ar: 'ديلي ساندويتش',
      item_description:
        'Delicious sandwich with only the finest selection from our deli.',
      item_description_ar: 'شطيرة لذيذة مع فقط أفضل تشكيلة من ديلي لدينا.',
      photo:
        'https://cofe-district.imgix.net/development/menu-item/menu-item-1517012270639.jpg',
      section_id: sections.costaFood.id,
      type: menuItemType.FOOD,
    },
    costaCookie: {
      id: '053d555e-ac57-4fbe-8a31-06ce43cbf010',
      name: 'Large Cookie',
      name_ar: 'كوكي كبير',
      item_description: 'Fresh from the bakery.',
      item_description_ar: 'طازجة من المخبز.',
      photo:
        'https://cofe-district.imgix.net/development/menu-item/menu-item-1517012297699.jpg',
      section_id: sections.costaFood.id,
      type: menuItemType.FOOD,
    },
    costaSoup: {
      id: '9a1c704b-3897-407f-944c-55d9bb39ba2c',
      name: 'Homemade Soup',
      name_ar: 'شوربة محلية الصنع',
      item_description: 'Deliciously home made soup.',
      item_description_ar: 'حساء المنزل لذيذ أدلى.',
      photo:
        'https://cofe-district.imgix.net/development/menu-item/menu-item-1517012326413.jpg',
      section_id: sections.costaFood.id,
      type: menuItemType.FOOD,
    },
    costaCaramelJelly: {
      id: '377305a8-032c-4cce-ae72-20a215fadb9e',
      name: 'Caramel Jelly',
      name_ar: 'كراميل جيلي',
      item_description:
        'Frozen coffee with milk and caramel topped with whipped cream and chocolate syrup.',
      item_description_ar:
        'قهوة مجمدة مع الحليب والكراميل مع الكريما المخفوقة وشراب الشوكولاتة.',
      photo:
        'https://cofe-district.imgix.net/development/menu-item/menu-item-1517012362106.jpg',
      section_id: sections.costaFrozen.id,
      type: menuItemType.FOOD,
    },
    costaChocoBanana: {
      id: 'ee8fc60f-800b-4645-852b-2848a609d26a',
      name: 'Choco Banana',
      name_ar: 'شوكو موز',
      item_description:
        'Frozen coffee with milk topped with whipped cream and chocolate syrup.',
      item_description_ar:
        'قهوة مجمدة مع حليب مغطى بالكريمة المخفوقة وشراب الشوكولاتة.',
      photo:
        'https://cofe-district.imgix.net/development/menu-item/menu-item-1517012382792.jpeg',
      section_id: sections.costaFrozen.id,
      type: menuItemType.FOOD,
    },
    starbucksColdBrew: {
      id: '912aac75-ad6e-4430-b582-16f9fc0c5f43',
      name: 'Cold Brew',
      name_ar: 'الشراب البارد',
      item_description: 'Cold press coffee made with our rich house blend.',
      item_description_ar:
        'القهوة الباردة الصحافة المصنوعة من مزيج منزلنا الغنية.',
      photo:
        'https://cofe-district.imgix.net/development/menu-item/menu-item-1517012441676.jpeg',
      section_id: sections.starbucksDrinks.id,
      type: menuItemType.DRINK,
    },
    starbucksAmericano: {
      id: '203b481a-423d-452b-94a0-f3b497f43181',
      name: 'Long Black Americano',
      name_ar: 'طويل أسود أمريكانو',
      item_description: 'Double-shot poured over our hot filtered water.',
      item_description_ar: 'سكب مزدوج على المياه الساخنة المصفاة.',
      photo:
        'https://cofe-district.imgix.net/development/menu-item/menu-item-1517012486628.jpeg',
      section_id: sections.starbucksDrinks.id,
      type: menuItemType.DRINK,
    },
    starbucksFilterBrew: {
      id: '18ef1612-ab5f-4e41-ba33-8778ba259fd9',
      name: 'Filter Brew',
      name_ar: 'مرشح المشروب',
      item_description:
        'Not just any standard coffee. We thoughtfully choose our regular and seasonal coffees and brew every hour to ensure maximum freshness.',
      item_description_ar:
        'ليس فقط أي القهوة القياسية. نختار بعناية القهوة العادية والموسمية ونحضر كل ساعة لضمان أقصى نضارة.',
      photo:
        'https://cofe-district.imgix.net/development/menu-item/menu-item-1517012515782.jpg',
      section_id: sections.starbucksDrinks.id,
      type: menuItemType.DRINK,
    },
    starbucksSandwich: {
      id: '6f4e5a68-3e28-44bb-8632-2b7d04fa47d5',
      name: 'Deli Sandwich',
      name_ar: 'ديلي ساندويتش',
      item_description:
        'Delicious sandwich with only the finest selection from our deli.',
      item_description_ar: 'شطيرة لذيذة مع فقط أفضل تشكيلة من ديلي لدينا.',
      photo:
        'https://cofe-district.imgix.net/development/menu-item/menu-item-1517012552577.jpg',
      section_id: sections.starbucksFood.id,
      type: menuItemType.FOOD,
    },
    starbucksCookie: {
      id: '0c8ac26a-a9ed-4339-b3ac-9a316152d15e',
      name: 'Large Cookie',
      name_ar: 'كوكي كبير',
      item_description: 'Fresh from the bakery.',
      item_description_ar: 'طازجة من المخبز.',
      photo:
        'https://cofe-district.imgix.net/development/menu-item/menu-item-1517012580224.jpg',
      section_id: sections.starbucksFood.id,
      type: menuItemType.FOOD,
    },
    starbucksSoup: {
      id: 'e6a4c96c-aa54-4cfd-824e-3445bea48c4b',
      name: 'Homemade Soup',
      name_ar: 'شوربة محلية الصنع',
      item_description: 'Deliciously home made soup.',
      item_description_ar: 'حساء المنزل لذيذ أدلى.',
      photo:
        'https://cofe-district.imgix.net/development/menu-item/menu-item-1517012602175.jpg',
      section_id: sections.starbucksFood.id,
      type: menuItemType.FOOD,
    },
    starbucksCaramelJelly: {
      id: '3b9332ce-076c-4a63-823a-0a3ebcf70c44',
      name: 'Caramel Jelly',
      name_ar: 'كراميل جيلي',
      item_description:
        'Frozen coffee with milk and caramel topped with whipped cream and chocolate syrup.',
      item_description_ar:
        'قهوة مجمدة مع الحليب والكراميل مع الكريما المخفوقة وشراب الشوكولاتة.',
      photo:
        'https://cofe-district.imgix.net/development/menu-item/menu-item-1517012627018.jpg',
      section_id: sections.starbucksFrozen.id,
      type: menuItemType.FOOD,
    },
    starbucksChocoBanana: {
      id: 'ee360c03-78f2-4036-98c3-a4e05944765d',
      name: 'Choco Banana',
      name_ar: 'شوكو موز',
      item_description:
        'Frozen coffee with milk topped with whipped cream and chocolate syrup.',
      item_description_ar:
        'قهوة مجمدة مع حليب مغطى بالكريمة المخفوقة وشراب الشوكولاتة.',
      photo:
        'https://cofe-district.imgix.net/development/menu-item/menu-item-1517012647192.jpeg',
      section_id: sections.starbucksFrozen.id,
      type: menuItemType.FOOD,
    },
  };

  const nutritionalIds = map(nutritionalInfos, 'id');

  return appendSortOrderToList(
    mapValues(menuItems, menuItem =>
      extend({}, menuItem, {
        base_nutritional_id: nutritionalIds.shift(),
      })
    ),
    'section_id',
    'sort_order'
  );
};
