module.exports = function CategoriesDataDecorator() {
  const decorateCategoriesData = (categories, menu) => {
    const decoratedCategoriesForDb = categories?.map((_category) => ({
      menuId: menu.id,
      name: _category.name,
      status: 'ACTIVE',
      sortOrder: 0,
    }));

    return decoratedCategoriesForDb;
  };

  return {
    decorateCategoriesData,
  };
};
