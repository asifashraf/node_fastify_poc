module.exports = function MdlCategoryProducts(opts) {

    const { config, baseModel, knexnest, moment, constants, httpRequest } = opts;

    const model = baseModel('categories');

    const { link } = model;

    const { coreModuleUrl, default_uuid, offer_bucket, cloudfront_url } = config;

    const { API_URLS } = constants;

    model.getCountries = async function getCountries(country_iso = null) {

        let requestData = { filters: { active: true }, fromDashboard: true };

        if (country_iso) {
            requestData = { filters: { active: true, iso_code: country_iso }, fromDashboard: true };
        }

        const countries = await httpRequest.send({
            path: `${coreModuleUrl}${API_URLS.COUNTRIES}`,
            method: 'POST',
            headers: { },
            params: requestData,
            json: true
        });

        let result = countries.data

        return result;
    }

    model.productVatCalculation = async function productVatCalculation(price, vatRate) {

        let vat_amount = price * (vatRate / 100);

        let priceWithVat = +price + +vat_amount;

        priceWithVat = priceWithVat.toFixed(2);

        priceWithVat = parseFloat(priceWithVat);

        return priceWithVat;
    }

    model.getProductDiscountedPrice = async function getProductDiscountedPrice(specificPrice, productPrice, vatRate) {

        let priceWithVat = await this.productVatCalculation(productPrice, vatRate)

        let reduction_price = {};

        if (specificPrice && specificPrice.length > 0) {
            reduction_price.id_reductionPrice = specificPrice[0].id;
            reduction_price.reductionType = specificPrice[0].reductionType;
            reduction_price.from = specificPrice[0].from;
            reduction_price.to = specificPrice[0].to;

            if (reduction_price.reductionType == 'percentage') {
                reduction_price.reductionValue = (specificPrice[0].reduction)*100;
                reduction_price.reductionAmount = priceWithVat ? (priceWithVat * specificPrice[0].reduction).toFixed(2) : 0;
                reduction_price.reductionAmountTaxExcl = productPrice ? (productPrice * specificPrice[0].reduction).toFixed(2) : 0;
            } else {

                let amountWithVat = await this.productVatCalculation(specificPrice[0].reduction, vatRate)

                reduction_price.reductionAmountTaxExcl = reduction_price.reductionValue = specificPrice[0].reduction;
                reduction_price.reductionAmount = amountWithVat;
            }
            
            reduction_price.reductionPercentage = (specificPrice[0].reductionPercentage)*100;
            reduction_price.reductionPercentage = reduction_price.reductionPercentage.toFixed(0);
        }

        if(Object.keys(reduction_price).length === 0) {
            reduction_price = null;
        };

        return reduction_price;
    }

    model.specificPrice = async function specificPrice(request = [], fromDashboard = false) {

        let now = moment();
        let formatted = now.format('YYYY-MM-DD HH:mm:ss');

        let _link = link
            .select(
                'psp.id as _id',
                'psp.reduction as _reduction',
                'psp.reduction_percentage as _reductionPercentage',
                'psp.reduction_type as _reductionType',
                'psp.date_to as _to',
                'psp.date_from as _from',
            )
            .from('product_specific_price as psp')
            .whereNull('deleted_at')

        if (!fromDashboard) {
            _link = _link.where(function (q) {
                q.where(function (q) {
                    q.where('psp.date_from', '<=', formatted).where('psp.date_to', '>=', formatted)
                }).orWhereNull('psp.date_from','psp.date_to')
            })
                .where('reduction', '>', 0).where('active', true).where('id_cart', default_uuid)
        }

        if (request.id) _link = _link.where('psp.id_product', request.id);

        if (request.id_product_attribute)
            _link = _link.where('psp.id_product_attribute', request.id_product_attribute);
        else
            _link = _link.where('psp.id_product_attribute', default_uuid)

        let result = await _link;

        result = knexnest.nest(result);

        if (result && result.length) {
            result[0].reduction = Number(result[0].reduction)
        }

        return result;
    }

    model.getProductsByFeatures = async function getProductsByFeatures(productIds, features) {

        let _link = link
            .select('pf.id_product as _idProduct',
                'pf.id_feature as _idFeature',
                'pf.id_feature_value as _idFeatureValue')
            .from('products as p')
            .innerJoin('product_features as pf', 'p.id', 'pf.id_product')
            .whereIn('p.id', productIds)

        let productFeatures = await _link;

        let featureProductIds = [];

        for (const feature of features) {

            const filteredProducts = productFeatures.filter(productF => productF._idFeature === feature.id_feature
                && productF._idFeatureValue.includes(feature.id_feature_value)
            );

            featureProductIds = filteredProducts.map((filteredProducts) => filteredProducts._idProduct);
            featureProductIds = [...new Set(featureProductIds)];
        }

        return featureProductIds;
    }

    model.autheticateCustomer = async function autheticateCustomer(cofeCustomerToken) {

        const authenticated = await httpRequest.send({
            path: `${coreModuleUrl}${API_URLS.AUTHENTICATE}`,
            method: 'POST',
            headers: { 'cofe-customer-token': cofeCustomerToken },
            json: true
        });

        return authenticated;
    }

    model.getProductOffer = async function getProductOffer(id, locale) {

        let now = moment();
        let formatted = now.format('YYYY-MM-DD HH:mm:ss');

        let _link = link
            .select(
                'o.id as id',
                'o.offer_type as offerType',
                'o.tag_color as tagColor',
                'om.offer_tag as offerTag',
                'om.offer_desc as offerDesc',
                'om.offer_icon as offerIcon',
                'o.date_from as dateFrom',
                'o.date_to as dateTo',
                'om.offer_desc_icon as offerDescIcon'
            )
            .from('offer_products as op')
            .innerJoin('offers as o', 'op.id_offer', 'o.id')
            .innerJoin('offers_metadata as om', 'o.id', 'om.id_offer')
            .where(function (q) {
                q.where(function (q) {
                    q.where('o.date_from', '<=', formatted).where('o.date_to', '>=', formatted)
                }).orWhereNull('o.date_from','o.date_to')
            })
            .where('op.id_product', id).where('active', true).whereNull('o.deleted_at').where('om.id_lang', locale)
            .first()

        let result = await _link;

        if(result !== undefined && Object.keys(result).length !== 0) {
            result.offerIcon = (result.offerIcon) ? `${cloudfront_url}${offer_bucket}${result.offerIcon}` : null;
            result.offerDescIcon = (result.offerDescIcon) ? `${cloudfront_url}${offer_bucket}${result.offerDescIcon}`: null;
        }

        return result;
    }

    model.getOfferProducts = async function getOfferProducts(filters, i8ln) {
        
        const { countryIso, locale } = i8ln

        const { offerTags } = filters;

        let discountedIds = true

        let discountedProducts = [];

        let now = moment();
        let formatted = now.format('YYYY-MM-DD HH:mm:ss');

        let _offerLink = link
            .from('offers as o')
            .where(function (q) {
                q.where(function (q) {
                    q.where('o.date_from', '<=', formatted).where('o.date_to', '>=', formatted)
                }).orWhereNull('o.date_from','o.date_to')
            })
            .innerJoin('offer_products as op', 'op.id_offer', 'o.id')
            .where({'o.country_iso': countryIso, 'active': true})
            .whereNull('o.deleted_at')

        if (offerTags && offerTags.length > 0) {

            let tags = ['discounted_offer'];

            const excludedUpto = "discounted_offer";

            const filteredArray = offerTags.filter(obj => obj.id !== excludedUpto);

            let ids = filteredArray.map(obj => obj.id);

            if (ids.length) {

                tags = await link
                    .from('offers_metadata as om')
                    .where( 'om.id_lang', locale).whereIn('om.id_offer', ids).pluck('om.offer_tag')
            }

            _offerLink = _offerLink.innerJoin('offers_metadata as om', 'o.id', 'om.id_offer')
                .where( 'om.id_lang', locale).whereIn('om.offer_tag', tags)

            var discounted = offerTags.find(item => item.id === 'discounted_offer');

            if (discounted === undefined)
                discountedIds = false;
        }  

        if (discountedIds) {

            discountedProducts = await link
                .from('product_specific_price as psp')
                .where(function (q) {
                    q.where(function (q) {
                        q.where('psp.date_from', '<=', formatted).where('psp.date_to', '>=', formatted)
                    }).orWhereNull('psp.date_from','psp.date_to')
                }).whereNull('deleted_at').where({ 'active': true, 'id_cart': default_uuid })
                .pluck('psp.id_product')
        }

        _offerLink = _offerLink.pluck('op.id_product')

        let offerProducts = await _offerLink;
        
        var idProducts = offerProducts.concat(discountedProducts.filter((item) => offerProducts.indexOf(item) < 0))

        return idProducts
    }

    return model;
}
