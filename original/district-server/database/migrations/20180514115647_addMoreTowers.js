exports.up = knex =>
  knex('towers').insert([
    {
      id: '682a4481-b88d-4147-bcde-631f718949e9',
      name: 'National Bank of Kuwait',
    },
    {
      id: 'bcb20f18-b426-46d5-8349-c167b001d919',
      name: 'Gulf Bank',
    },
    {
      id: 'b46ff829-814d-48c2-b981-a6d675d2432b',
      name: 'Commercial Bank of Kuwait',
    },
    {
      id: 'b9ca6e73-0e56-4d28-b682-ffbd2225b7b8',
      name: 'Burgan Bank',
    },
    {
      id: 'e3cc9fa1-6a99-4fbd-aa75-d3fcc5a93436',
      name: 'Kuwait International Bank',
    },
    {
      id: 'bf5b753f-2e3c-429f-b8c3-59b567ee46ef',
      name: 'Ahli United Bank',
    },
    {
      id: '0d21e02c-9cf5-46f6-9667-8531c621be03',
      name: 'Ahli Bank of Kuwait',
    },
    {
      id: 'ef264401-9756-431c-9e29-6c9b120a4a99',
      name: 'KBT',
    },
    {
      id: '5f8199fa-9fcb-416b-9f2c-abade719a1e9',
      name: 'Industrial Bank of Kuwait',
    },
    {
      id: '60a5e18f-3669-457a-adde-4cccce01e655',
      name: 'Boubyan Bank',
    },
    {
      id: 'c7caa967-dea5-4033-ba9d-6ccdfef3ed3e',
      name: '25 February Tower',
    },
    {
      id: 'caff2b2f-70c7-4bf0-9c77-55a58c3b7fb3',
      name: '26 February Tower',
    },
    {
      id: '3fe5597e-0c40-4e9f-aada-dc5cc4b72193',
      name: 'Gulf Investment Corporation',
    },
    {
      id: '7d3692e1-6970-457a-a313-643f3e3058a5',
      name: 'Sanabil Tower',
    },
    {
      id: 'ca53cee9-5943-494d-a466-b602ef79a8da',
      name: 'Al Salhiya Tower',
    },
    {
      id: 'a38c42cd-ce8e-41de-bd03-abfbbc9faefa',
      name: 'Seif Palace',
    },
    {
      id: 'b4100d24-23c7-420f-bf99-08fbf131fd4a',
      name: 'Mazaya 1 Tower',
    },
    {
      id: '8cf99d47-a784-4021-92a0-5e6ff1c532a4',
      name: 'Mazaya 2 Tower',
    },
    {
      id: '48a906ce-777f-47aa-b7da-26690405d1c2',
      name: 'Mazaya 3 Tower',
    },
    {
      id: '0d2f72c7-915a-4063-ba06-da1b816d3b8a',
      name: 'Al Amiri Hospital',
    },
    {
      id: 'c0c7f9ab-612d-4fc0-86bd-818a838d3c47',
      name: 'Al Sahab Tower',
    },
    {
      id: 'aef537d4-8089-48ad-874e-6dfc1275caaf',
      name: 'Law Courts Palace',
    },
  ]);

exports.down = knex =>
  knex('towers')
    .whereIn('id', [
      '682a4481-b88d-4147-bcde-631f718949e9',
      'bcb20f18-b426-46d5-8349-c167b001d919',
      'b46ff829-814d-48c2-b981-a6d675d2432b',
      'b9ca6e73-0e56-4d28-b682-ffbd2225b7b8',
      'e3cc9fa1-6a99-4fbd-aa75-d3fcc5a93436',
      'bf5b753f-2e3c-429f-b8c3-59b567ee46ef',
      '0d21e02c-9cf5-46f6-9667-8531c621be03',
      'ef264401-9756-431c-9e29-6c9b120a4a99',
      '5f8199fa-9fcb-416b-9f2c-abade719a1e9',
      '60a5e18f-3669-457a-adde-4cccce01e655',
      'c7caa967-dea5-4033-ba9d-6ccdfef3ed3e',
      'caff2b2f-70c7-4bf0-9c77-55a58c3b7fb3',
      '3fe5597e-0c40-4e9f-aada-dc5cc4b72193',
      '7d3692e1-6970-457a-a313-643f3e3058a5',
      'ca53cee9-5943-494d-a466-b602ef79a8da',
      'a38c42cd-ce8e-41de-bd03-abfbbc9faefa',
      'b4100d24-23c7-420f-bf99-08fbf131fd4a',
      '8cf99d47-a784-4021-92a0-5e6ff1c532a4',
      '48a906ce-777f-47aa-b7da-26690405d1c2',
      '0d2f72c7-915a-4063-ba06-da1b816d3b8a',
      'c0c7f9ab-612d-4fc0-86bd-818a838d3c47',
      'aef537d4-8089-48ad-874e-6dfc1275caaf',
    ])
    .delete();
