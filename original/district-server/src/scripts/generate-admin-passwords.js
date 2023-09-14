/* eslint-disable camelcase */
const fs = require('fs');
const csv = require('fast-csv');
const generate = require('nanoid/generate');
const bcrypt = require('bcryptjs');

const knex = require('../../database');

const saltRounds = 15;

knex
  .transaction(async trx => {
    const csvFile = './missing-admin-passwords.csv';
    const append = (file, rows = []) => {
      const csvFile = fs.createWriteStream(file, {
        flags: 'a',
        includeEndRowDelimiter: true,
      });
      csvFile.write('\n');
      csv.writeToStream(csvFile, rows);
    };

    const { rows } = await trx.raw(
      `select * from admins where "password" is null;`
    );
    const transactions = [];
    const adminData = [];
    console.log(`${rows.length} admins without password`);
    let i = 1;
    rows.map(row => {
      const characterSet = 'ACDEFGHJKLMNPRTUVWXYacdefghjklmnprtuvwxy0123456789';
      const shortCodeLength = 12;
      const password = generate(characterSet, shortCodeLength);
      const hashedPassword = bcrypt.hashSync(password, saltRounds);
      adminData.push({ id: row.id, email: row.email, password });
      transactions.push(
        trx('admins')
          .where('id', row.id)
          .update({
            password: hashedPassword,
          })
      );
      console.log(`${i} - ${row.email}`);
      i += 1;
      return row;
    });

    append(csvFile, adminData);

    return Promise.all(transactions);
  })
  .then(() => {
    console.log('all done!');
    return knex.destroy();
  })
  .catch(err => {
    console.log('error', err);
    return knex.destroy();
  });
