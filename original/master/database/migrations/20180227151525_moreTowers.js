exports.up = knex =>
  knex('towers').insert([
    {
      id: '78c5f9e7-57bb-4aaf-90d3-f3b18bdd722d',
      name: 'Kipco Tower',
    },
    {
      id: '307e8619-ff3d-462b-a671-26d5851555cc',
      name: 'Baitak Tower',
    },
    {
      id: 'af2963b9-6498-46e9-bc78-eb5ad882cb7f',
      name: 'KFH Head Office',
    },
    {
      id: '5606122f-749a-4554-a776-ee795159beaf',
      name: 'Ooredoo Tower',
    },
    {
      id: 'fcd11fa0-18e2-457e-a3a7-638c9a75eb18',
      name: 'Tijariya Tower',
    },

    {
      id: '62536f50-cb56-4493-a364-9e1f2507cf5f',
      name: 'Al Rayah Tower',
    },

    {
      id: 'dbf87cf2-5795-465e-b59c-5528220b1e87',
      name: 'Al Rayah Center',
    },

    {
      id: '018e28f2-63b6-4f2b-bc48-ce33f97aeddb',
      name: 'Ministries Complex',
    },

    {
      id: '5ff43ba8-9357-4fa9-9a5f-489ab644ba72',
      name: 'Central Bank of Kuwait',
    },
  ]);

exports.down = knex =>
  knex('towers')
    .whereIn('id', [
      '78c5f9e7-57bb-4aaf-90d3-f3b18bdd722d',
      '307e8619-ff3d-462b-a671-26d5851555cc',
      'af2963b9-6498-46e9-bc78-eb5ad882cb7f',
      '5606122f-749a-4554-a776-ee795159beaf',
      'fcd11fa0-18e2-457e-a3a7-638c9a75eb18',
      '62536f50-cb56-4493-a364-9e1f2507cf5f',
      'dbf87cf2-5795-465e-b59c-5528220b1e87',
      '018e28f2-63b6-4f2b-bc48-ce33f97aeddb',
      '5ff43ba8-9357-4fa9-9a5f-489ab644ba72',
    ])
    .delete();
