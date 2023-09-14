const fs = require('fs');
const builder = require('xmlbuilder');
const { uploadXmlFileOnS3Bucket, getObjectPresignedURL } = require('../lib/aws-s3');
const { isProd, xmlfeed } = require('../../config');
const path = require('path');

const getFeeds = async (req, res) => {
  try {
    const s3Bucket = xmlfeed.s3Bucket;
    const s3BucketFolder = isProd ? 'prod' : 'test';
    const xmlFileName = `google_feed_${req.params.country}_${req.params.lang}.xml`;
    const s3Key = `${s3BucketFolder}/${xmlFileName}`;

    const url = await getObjectPresignedURL(s3Bucket, s3Key, 60 * 10);

    if (!url) {
      res.end('XML Feed is not ready yet! Please try again visit in 15 minutes.');
    } else {
      res.redirect(url); // Return URL
    }

  } catch (err) {
    console.log('xmlfeederror: ', err);
    // TODO: will add logger
    res.status(400).send('Error');
  }
};

const generateFeeds = async (req, res) => {
  try {
    const { queryContextWithoutAuth: context } = req.app;

    const requestedCountry = await context.country.getByIsoCode(req.params.country);

    if (!requestedCountry) {
      res.end('please enter a valid country code');
    }

    const languages = ['en', 'ar', 'tr'];
    if (!languages.includes(req.params.lang)) {
      res.end('please enter a valid locale');
    }

    const fieldsMap = {
      'g:id': 'id',
      'g:title': 'title',
      'g:description': 'description',
      'g:product_type': 'product_type',
      'g:section': 'section',
      'g:price': 'price',
      'g:availability': 'availability',
      'g:condition': 'condition',
      'g:brand': 'brand',
      'g:country': 'country',
      'g:link': 'link',
      'g:image_link': 'image_link',
    };
    const brands = await context.brand.getBrandsByCountry(requestedCountry.id);

    const requestedCurrency = await context.currency.getByCurrencyId(requestedCountry.currencyId);

    const currencySymbol = (requestedCurrency) ? requestedCurrency.symbol : 'AED';

    const rss = builder.create('rss');
    rss.att('xmlns:g', 'http://base.google.com/ns/1.0'); //set RSS version
    rss.att('version', '1.0');

    const channel = rss.ele('channel');
    await Promise.all(brands.map(async brand => {
      // eslint-disable-next-line max-len
      const brandMenu = await context.menu.getByBrandAndCountry(brand.id, requestedCountry.id);

      if (brandMenu) {
        // eslint-disable-next-line max-len
        const menuSections = await context.menuSection.getByMenuId(brandMenu.id);

        await Promise.all(menuSections.map(async element => {
          try {
            if (typeof element !== 'undefined' && element.length !== 0) {

              // eslint-disable-next-line max-len
              const menuItems = await context.menuItem.getByMenuSection(element.id);

              await Promise.all(menuItems.map(async item => {
                let price;
                const xmlItem = channel.ele('item');
                const menuItemsOptionSet = await context.menuItemOptionSet.getByMenuItem(item.id);

                if (typeof menuItemsOptionSet !== 'undefined' && menuItemsOptionSet.length !== 0) {
                  const menuItemsOptionPrice = menuItemsOptionSet.filter(obj => obj.label === 'Price')[0];

                  price = `${currencySymbol} 0.00`;
                  if (typeof menuItemsOptionPrice !== 'undefined') {
                    const menuItemsOption = await context.menuItemOption.getByMenuOptionSet(menuItemsOptionPrice.id);
                    if (typeof menuItemsOption !== 'undefined' && menuItemsOption.length !== 0) {
                      price = currencySymbol + ' ' + menuItemsOption[0].price;
                    }
                  }
                }

                Object.entries(fieldsMap).forEach(([xmlkey, field]) => {
                  switch (field) {
                    case 'id':
                      xmlItem.ele(xmlkey, item.id);
                      break;
                    case 'title':
                      // eslint-disable-next-line max-len
                      xmlItem.ele(xmlkey, req.params.lang == 'en' ? item.name : (req.params.lang == 'ar' ? item.nameAr : item.nameTr));
                      break;
                    case 'description':
                      // eslint-disable-next-line max-len
                      xmlItem.ele(xmlkey, req.params.lang == 'en' ? item.itemDescription : (req.params.lang == 'ar' ? item.itemDescriptionAr : item.itemDescriptionTr));
                      break;
                    case 'section':
                      xmlItem.ele(xmlkey, element.name);
                      break;
                    case 'brand':
                      xmlItem.ele(xmlkey, brand.name);
                      break;
                    case 'product_type':
                      xmlItem.ele(xmlkey, item.type);
                      break;
                    case 'price':
                      xmlItem.ele(xmlkey, price);
                      break;
                    case 'condition':
                      xmlItem.ele(xmlkey, 'new');
                      break;
                    case 'availability':
                      xmlItem.ele(xmlkey, 'in stock');
                      break;
                    case 'country':
                      xmlItem.ele(xmlkey, req.params.country.toUpperCase());
                      break;
                    case 'link':
                      xmlItem.ele(xmlkey, 'https://www.cofeapp.com/');
                      break;
                    case 'image_link':
                      xmlItem.ele(xmlkey, item.photo);
                      break;
                  }
                });
              }));
            }
          } catch (err) {
            console.log('xmlfeederror: ', err);
          }
        }));
      }
    }));

    const xml = rss.end({ pretty: true });

    const s3Bucket = xmlfeed.s3Bucket;
    const s3BucketFolder = isProd ? 'prod' : 'test';
    const xmlFolder = path.resolve(xmlfeed.xmlFolderSegment1, xmlfeed.xmlFolderSegment2);
    const xmlFileName = `google_feed_${req.params.country}_${req.params.lang}.xml`;
    const xmlFilePath = path.join(xmlFolder, xmlFileName);

    const s3Key = `${s3BucketFolder}/${xmlFileName}`;
    fs.writeFileSync(xmlFilePath, xml); // create
    const data = fs.readFileSync(xmlFilePath, 'utf8'); // read
    await uploadXmlFileOnS3Bucket(s3Bucket, s3Key, data); // upload
    fs.unlinkSync(xmlFilePath); // delete
    //const url = await getObjectPresignedURL(s3Bucket, s3Key, 60 * 10);
    res.end('XML Generated');
  } catch (err) {
    console.log('xmlfeederror: ', err);
    // TODO: will add logger
    res.status(400).send('Error');
  }
};

module.exports = {
  getFeeds,
  generateFeeds,
};
