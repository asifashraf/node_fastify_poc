module.exports = function MdlSuppliers(opts) {

    const { config, baseModel, knexnest, guid, httpRequest, constants } = opts;

    const model = baseModel('suppliers');

    const { link } = model;

    const { languages, backofficeMsUrl, cloudfront_url, supplier_bucket } = config;

    const { API_URLS } = constants;

    model.createSupplier = async function createSupplier(supplier) {

        const { vat_number, phone, email, name, active, verification_code ,is_verified, commission, service_email,
            service_phone, description, image, business_model } = supplier;

        const itExists = await this.doesExist((builder) => {
            builder.where('deleted_at', null);
            builder.where((innerBuilder)=>{
                innerBuilder
                .where({ email })
                .orWhere({ phone })
            })
        })

        if (itExists){
            throw new Error(`supplier_already_exists`)
        }

        const [ insertedSupplier ] = await link('suppliers').insert({
            id: guid.v4(),
            vat_number,
            phone,
            email,
            active,
            verification_code,
            is_verified,
            commission,
            service_email,
            service_phone,
            image,
            business_model
        }, 'id');

        const { id } = insertedSupplier;

        const supplierMetadata = await link('suppliers_metadata').insert([
            { id: guid.v4(), id_supplier: id, name, id_lang: languages.en, description },
            { id: guid.v4(), id_supplier: id, name, id_lang: languages.ar, description },
        ], '*');

        let password = (length = 10) => Math.random().toString(20).substr(2, length)

        const requestData = { user : { id, first_name: name, last_name: name, email, password: password() } };

        await this.createSupplierUser(requestData)

        return { data: { supplier_id: id, supplier_metadata: supplierMetadata  } };
    }

    model.updateSupplier = async function updateSupplier(supplier, i8ln) {

        const { id, active, vat_number, phone, email, name, verification_code ,is_verified, commission, service_email, service_phone, description, image, business_model } = supplier;

        const supplierKeys = [
            'active',
            'vat_number',
            'phone',
            'email',
            'verification_code',
            'is_verified',
            'commission',
            'service_email',
            'service_phone',
            'image',
            'business_model'
        ]

        let toUpdate = false

        for (key of supplierKeys){
            if (supplier.hasOwnProperty(key)){
                toUpdate = true
                break
            }
        }

        if (toUpdate){
            const updatedSupplier = await this.update({
                active,
                vat_number,
                phone,
                email,
                verification_code,
                is_verified,
                commission,
                service_email,
                service_phone,
                image,
                business_model,
                updated_at: this.now()
            },
            {
                id,
                deleted_at: null
            });

            if (!updatedSupplier?.length){
                throw new Error(`supplier_not_exists`)
            }
        }

        let supplierMetadata = {}

        const { locale } = i8ln

        if (name || description){
            supplierMetadata = await link('suppliers_metadata')
                .where({ id_supplier: id, id_lang: locale })
                .update({ name, description })
                .returning('*')
        } else{
            supplierMetadata = await link('suppliers_metadata')
                .where({ id_supplier: id, id_lang: locale })
                .returning('*')
        }


        return { data: { supplier_id: id, supplier_metadata: supplierMetadata  } };
    }

    model.createCommission = async function createCommission(commission) {

        const { id_category, id_supplier, commission_percentage } = commission;

        let itExists = await this.doesExist((builder) => {
            builder.where('id', id_supplier);
        })

        if (!itExists){
            throw new Error(`supplier_not_exists`)
        }

        const categories  = baseModel('categories');

        itExists = await categories.doesExist((builder) => {
            builder.where('id', id_category);
        })

        if (!itExists){
            throw new Error(`category_not_exists`)
        }

        const supplierCategoryCommission = await link('suppliers_category_commission').insert({
            id: guid.v4(),
            id_category,
            id_supplier,
            commission_percentage
        })
        .onConflict(['id_category','id_supplier'])
        .merge({
            commission_percentage
        })
        .returning('*');

        return { data: { supplier_id: id_supplier, supplier_category_commission : supplierCategoryCommission } };
    }

    model.getAll = async function getAll( filters, pagination, i8ln ) {

        const { perPage, currentPage, paginate } = pagination;

        const { locale } = i8ln;

        const { active, keyword, id, business_model } = filters;

        let _link = link
            .select(
                's.id as _id',
                's.active as _active',
                's.phone as _phone',
                's.business_model as _businessModel',
                's.email as _email',
                's.vat_number as _vatNumber',
                's.service_email as _serviceEmail',
                's.service_phone as _servicePhone',
                's.commission as _commission',
                'sm.description as _description',
                'sm.name as _name',
            )
            .from('suppliers as s')
            .innerJoin('suppliers_metadata as sm', 's.id', 'sm.id_supplier')
            .leftJoin('product_suppliers as ps', 's.id', 'ps.id_supplier')
            .count("ps.id_product as _numberOfProducts")
            .where('sm.id_lang', locale)
            .whereNull('s.deleted_at')
            .orderBy('s.created_at', 'desc')
            .groupBy('s.id','sm.name', 'sm.description');

        if (active !== undefined) {
            _link = _link.where('s.active', active);
        }

        if (id) {
            _link = _link.where('s.id', id);
        }

        if (keyword) {
            _link.where((builder)=>{
                builder
                    .where('sm.name', 'Ilike', '%' + filters.keyword + '%')
                    .orWhere('sm.description', 'Ilike', '%' + keyword + '%')
                    .orWhere('s.phone', 'Ilike', '%' + keyword + '%')
                    .orWhere('s.email', 'Ilike', '%' + keyword + '%')
            })
        }

        if (business_model) {
            _link = _link.where('s.business_model', business_model);
        }

        if (paginate)
            _link = _link.paginate({ perPage, currentPage, isLengthAware: true });

        let result = await _link;

        if (paginate) {
            result.data = knexnest.nest(result.data);
            result.pagination = result.pagination;
        } else {
            result.data = knexnest.nest(result);
        }

        return result;
    }

    model.deleteSupplier = async function deleteSupplier(id) {
        const deleted = await this.softDelete(
            {
                id,
                deleted_at: null
            },
            { active: false }
        );

        if (!deleted?.length){
            throw new Error(`supplier_not_exists`)
        }

       return deleted
    }

    model.specificSupplier = async function specificSupplier(params) {

        const { id } = params;

        const supplier = await link('suppliers')
            .select(
                'active', 'phone', 'email', 'vat_number', 'service_email', 'service_phone', 'commission', 'image', 'business_model')
                .where('id', id)
                .first()

        if (!supplier)
            throw new Error(`supplier_not_exists`)

        const supplierMetaData = await link('suppliers_metadata')
            .where({ id_supplier: id })
            .returning('*')

        const supplierLocations = await link('supplier_locations')
            .where({ id_supplier: id, active: true })
            .returning('*')

        supplier.image = (supplier.image) ? `${cloudfront_url}${supplier_bucket}${supplier.image}` : null;

        return { data: { id, ... supplier, supplier_metadata: supplierMetaData, locations: supplierLocations } };
    }

    model.createSupplierUser = async function createSupplierUser(requestData) {

        const user = await httpRequest.send({
            path: `${backofficeMsUrl}${API_URLS.ADD_USER}`,
            method: 'POST',
            headers: { } ,
            params: requestData,
            json: true
        });

        let result = user.data

        return result;
    }

    model.bulkSupplierList = async function bulkSupplierList(supplierIds) {

        let _link = link
            .select(
                's.id as _id',
                's.active as _active',
                's.phone as _phone',
                's.email as _email',
                's.business_model as _businessModel',
                's.vat_number as _vatNumber',
                's.service_email as _serviceEmail',
                's.service_phone as _servicePhone',
                's.commission as _commission',
                'sm.name as _meta_name',
            )
            .from('suppliers as s')
            .innerJoin('suppliers_metadata as sm', 's.id', 'sm.id_supplier')

        if (supplierIds.length) {
            _link = _link.whereIn('s.id', supplierIds)
        }

        let result = await _link;

        return { data: knexnest.nest(result) };
    }

    return model;
}
