module.exports = function () {
  const decorate = ({ data, menu }) => {
    const { cofe_menu_section_id } = data;
    const cofeSectionId = cofe_menu_section_id || null;

    const categoryData = {
      menuId: menu.id,
      name: data.name,
      status: 'ACTIVE',
      //menu_id: menu.id,
      sortOrder: 0,
      //photo: image || "https://www.fesports.com.au/files/img/stock_256x256.jpg",
    };

    if (cofeSectionId != null) categoryData['id'] = cofeSectionId;

    return categoryData;
  };
  return {
    async update({ data, dbContext }) {
      const { cofe_menu_section_id } = data;

      if (cofe_menu_section_id === null) {
        delete data.cofe_menu_section_id;

        return await this.link({ data, dbContext,
          menu: {
            id: data.menuId
          }
        });
      }

      const item = {
        id: cofe_menu_section_id,
        name: data.name,
        status: 'ACTIVE',
      };
      await dbContext.save([item]);
      return {
        message: {
          ...data,
          entity: 'category',
        },
        done: true
      };
    },
    async link({ data, dbContext, brand, menu, qContext }) {
      const decoratedData = decorate({ data, menu });
      const validate = await dbContext.validate([decoratedData]);
      const { errors } = validate;
      if (errors && errors.length > 0) {
        console.error('Foodics-Category-Linker > Errors >', errors);
        throw new Error('Foodics-Category-Linker Decorator Validation Failed');
      }
      const [categoryId] = await dbContext.save([decoratedData]);
      return {
        message: {
          cofe_menu_section_id: categoryId,
          ...data,
          entity: 'category',
        },
        done: true
      };
    }
  };
}();
