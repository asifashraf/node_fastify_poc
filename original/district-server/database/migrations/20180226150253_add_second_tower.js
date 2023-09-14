exports.up = knex =>
  knex('towers').insert({
    id: '871e1f9c-62e2-4167-b1b2-622cd37f550e',
    name: 'Crystal Tower',
  });

exports.down = knex =>
  knex('towers')
    .where('id', '871e1f9c-62e2-4167-b1b2-622cd37f550e')
    .delete();
