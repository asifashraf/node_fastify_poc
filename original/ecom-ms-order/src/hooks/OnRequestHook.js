const {languages, locales, default_country} = require("../globals/config");
const i18n = require('../globals/i18n');

module.exports = function (request, reply, done) {

    const headers = request.headers;

    var locale = headers['locale'] || 'en';
   
    let localeExists = locales.includes(locale);
   
    if (!localeExists) { 
        locale = 'en';
    }

    const countryIso = headers['country-iso'] || default_country;

    request.i8ln = {
        id_lang: languages[locale],
        locale: locale,
        countryIso: countryIso.toUpperCase(),
        cofeCustomerToken: headers['cofe-customer-token'] || null,
        city: headers['city'] || 'Others'
    }

    request.pagination = {
        perPage: headers['per-page'] || 10,
        currentPage: headers['current-page'] || 1,
        paginate: (headers['pagination']) ? JSON.parse(headers['pagination']) : false,
    }

    i18n.setLocale(locale)

    done();
}
