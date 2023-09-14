exports.up = knex =>
  knex('neighborhoods').insert([
    { id: '22b5e8e9-adb2-487a-8157-36aa4bbc367d', name: 'Bneid Al Qar' },
    { id: 'ad4480bf-bcf5-4f8e-90fc-404459843a67', name: 'Al Soor Gardens' },
  ]);

exports.down = knex =>
  knex('neighborhoods')
    .whereIn('id', [
      '22b5e8e9-adb2-487a-8157-36aa4bbc367d',
      'ad4480bf-bcf5-4f8e-90fc-404459843a67',
    ])
    .delete();
