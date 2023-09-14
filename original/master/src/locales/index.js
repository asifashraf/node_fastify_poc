const { template } = require('lodash');
const en = require('./en.json');
const ar = require('./ar.json');
const tr = require('./tr.json');
const locales = { en, ar, tr };
module.exports = () => {
  return (lang, string, interpolateParams) => {
    const str = locales[lang][string] ? locales[lang][string] : string;
    return template(str)(interpolateParams);
  };
};
