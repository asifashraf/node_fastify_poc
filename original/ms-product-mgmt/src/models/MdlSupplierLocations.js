module.exports = function MdlSupplierLocations(opts) {

    const { baseModel, guid, knexnest, httpRequest, config, constants } = opts;

    const { coreModuleUrl } = config

    const { API_URLS } = constants;

    const model = baseModel('supplier_locations');

    const { link } = model;


    model.createSupplierLocation = async function createSupplierLocation(location) {

        location.id =  guid.v4()

       const supplier  = await link('suppliers')
        .where({ id : location.id_supplier })
        .first('id')

        if (!supplier){
            throw new Error(`supplier_not_exists`)
        }

        location = await this.getCountryAndCity(location.id_country, location)

        const [ supplierLocation ] = await this.insert(location)

        return { data: { ...supplierLocation  } }
    }

    model.updateSupplierLocation = async function updateSupplierLocation(location) {

        const { id } = location

        location.updated_at = this.now()

        location = await this.getCountryAndCity(location.id_country, location)

        const [ supplierLocation ] = await this.update(location, { id , deleted_at: null})

        if (!supplierLocation){
            throw new Error(`supplier_location_not_exists`)
        }

        return { data: { ...supplierLocation  } }
    }

    model.getAllSupplierLocations = async function getAllSupplierLocations( id_supplier, filters, pagination ) {

        const { perPage, currentPage } = pagination;

        const { active } = filters;

        let _link = link
            .select(
                'sl.id as _id',
                'sl.id_supplier as _idSupplier',
                'sl.first_name as _firstName',
                'sl.last_name as _lastName',
                'sl.alias as _alias',
                'sl.company as _company',
                'sl.address as _address',
                'sl.id_country as _idCountry',
                'sl.country_name as _countryName',
                'sl.id_city as _idCity',
                'sl.city_name as _cityName',
                'sl.phone as _phone',
                'sl.mobile as _mobile',
                'sl.postcode as _postcode',
                'sl.active as _active',
            )
            .from('supplier_locations as sl')
            .where('sl.id_supplier', id_supplier)
            .whereNull('sl.deleted_at')

        if (active !== undefined) {
            _link = _link.where('sl.active', active);
        }

        _link = _link.paginate({ perPage, currentPage, isLengthAware: true });

        let result = await _link;

        result.data = knexnest.nest(result.data);

        return result;
    }

    model.deleteSupplierLocation = async function deleteSupplierLocation(id) {
        const deleted = await this.softDelete(
            {
                id,
                deleted_at: null
            },
            { active: false }
        );

        if (!deleted?.length){
            throw new Error(`supplier_location_not_exists`)
        }

       return deleted
    }

    model.getCountryAndCity = async function getCountryAndCity( id_country, payload ) {

        if(!id_country){
            return payload
        }

        const countries = await httpRequest.send({
            path: `${coreModuleUrl}${API_URLS.COUNTRIES}`,
            method: 'POST',
            headers: { },
            params: { filters: { active: true, id_country } },
            json: true
        })


        if(!countries?.data?.length){
            throw new Error(`country_not_exists`)
        }

        payload.country_name = countries.data[0]?.name

        if(Array.isArray(countries.data[0].city) && countries.data[0].city.length && payload.id_city){
            const city = countries.data[0].city
                                .find((cty)=> cty.cityId === payload.id_city && cty.active)?.name

            if(!city){
                throw new Error(`city_not_exists`)
            }

            payload.city_name = city
        }

        return payload
    }

    model.bulkSuppliersLocations = async function bulkSuppliersLocations( filters, i8ln ) {

        const { id_suppliers, id_country } = filters;

        let _link = link.from('supplier_locations as sl')
            .whereIn('sl.id_supplier', id_suppliers).where({ 'id_country': id_country, 'active': true })
            .whereNull('sl.deleted_at') 

        let result = await _link;

        return { data : result };
    }
    
    return model
}
