module.exports = (function CategoriesDataDecorator() {
  function decorateCategoriesData({ categories }) {
    const decoratedCategoriesForDb = categories?.map((_category) => ({
      id: _category._id,
      name: _category.name,
      description: _category.description,
      account: _category.account,
      pos_location_id: _category.posLocationId,
      pos_category_type: _category.posCategoryType,
      pos_category_id: _category.posCategoryId,
      image_url: _category.imageUrl,
      level: _category.level,
      menu: _category.menu,
    }));

    return decoratedCategoriesForDb;
  }

  return {
    decorateCategoriesData,
  };
})();
