module.exports = {
  NutritionalInfo: {
    allergens({ id }, args, context) {
      return context.nutritionalInfo.getAllergensByNutritionalInfo(id);
    },
    async nutrients({id }, args, context){
      const nutritionalInfo = await context.nutritionalInfo.getById(id);
      const nutrients = [];
      if(nutritionalInfo){
        if(typeof nutritionalInfo.calories == 'number'){
          nutrients.push({
            name: { en:'Calories', ar:'سعرات حرارية', tr:'Kalori'},
            value: nutritionalInfo.calories > 0 ? nutritionalInfo.calories:0
          })
        }
        if(typeof nutritionalInfo.fat == 'number'){
          nutrients.push({
            name: { en:'Fat', ar: 'دهون', tr: 'Yağ'},
            value: nutritionalInfo.fat > 0 ? nutritionalInfo.fat:0
          })
        }
        if(typeof nutritionalInfo.carbohydrates == 'number'){
          nutrients.push({
            name: { en:'Carbohydrates', ar: 'كاربوهيدرات', tr: 'Karbonhidrat'},
            value: nutritionalInfo.carbohydrates > 0 ? nutritionalInfo.carbohydrates:0
          })
        }
        if(typeof nutritionalInfo.sugar == 'number'){
          nutrients.push({
            name: { en:'Sugar', ar: 'سكر', tr: 'Şeker'},
            value: nutritionalInfo.sugar > 0 ? nutritionalInfo.sugar:0
          })
        }
        if(typeof nutritionalInfo.protein == 'number'){
          nutrients.push({
            name: { en:'Protein', ar: 'بروتين', tr: 'Protein'},
            value: nutritionalInfo.protein > 0 ? nutritionalInfo.protein:0
          })
        }
      }
      return nutrients;
    }
  },
};
