exports.callDB = async query => {
  try {
    const resp = Array.isArray(query) ? await Promise.all(query) : await query;
    return resp;
  } catch (error) {
    console.log('callDb-Error', error);
    throw new Error('Data fetching error.');
  }
};

exports.getSellerInfo = (country) => {
  const sellerInfoObj = {
    'SA': {
      name: 'District General Trading Co LLC - Saudi',
      address: 'شارع الامام مالك 3141 انس بن مالك الرياض، الملقا',
      cityCountry: 'الرياض، المملكة العربية السعودية',
    },
    'AE': {
      name: 'District General Trading Co. (UAE)',
      address: 'Office No 208, 2nd Floor, Emaar Business Park Building 4',
      cityCountry: 'Dubai, United Arab Emirates',
    },
    'KW': {
      name: 'District for General Trading W.L.L',
      address: '46th Floor, Kipco Tower, Al Shuhada Street',
      cityCountry: 'Al Sharq Area, Kuwait City',
    }
  };
  return {...sellerInfoObj[country.isoCode], vat: country.vatId || ''};
};

exports.calculateTax = (total, taxRate) => {
  const _taxRate = Number(taxRate);
  return _taxRate ? total - (total / ((_taxRate / 100) + 1)) : 0;
};

exports.formatNumericValues = data => Number(data.toFixed(2)).toString();
