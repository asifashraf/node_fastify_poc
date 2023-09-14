module.exports = function MdlManufacturers(opts) {

    const {config, baseModel, knexnest, guid, slugify} = opts;

    const model = baseModel('manufacturers');

    const {link} = model;

    const {languages, cloudfront_url, manufacturer_bucket, default_image_url} = config;

    model.getAll = async function getAll(filters, pagination, i8ln) {

        let response = { data: null, pagination: null }

        const {active, id_manufacturer, keyword} = filters;

        const { locale } = i8ln

        const { perPage, currentPage, paginate } = pagination

        let _link = link
            .select(
                'm.id as _id',
                'mm.name as _name',
                'mm.image as _image',
                'm.slug as _slug'
            )
            .from('manufacturers as m')
            .innerJoin('manufacturers_metadata as mm', 'm.id', 'mm.id_manufacturer')
            .where('mm.id_lang', locale)
            .whereNull('m.deleted_at')
            .orderBy('m.created_at', 'desc')

        if (active) _link = _link.where('m.active', active)

        if (id_manufacturer) _link = _link.whereIn('m.id', id_manufacturer)

        if (keyword) {
            _link = _link.where('mm.name', 'Ilike', '%' + keyword + '%')
        }

        if (paginate)
            _link = _link.paginate({perPage, currentPage, isLengthAware: true});

        let result = await _link;

        if (paginate) {
            response.data = knexnest.nest(result.data);
            response.pagination = result.pagination;
        } else {
            response.data = knexnest.nest(result);
        }

        let manufacturers = response.data;

        if (manufacturers) {

            for (let manufacturer of manufacturers) {
                const {id, image} = manufacturer;

                const manufacturerIndex = manufacturers.findIndex(x => x.id === id);

                if (manufacturerIndex !== -1) {

                    if (!image) {
                        manufacturers[manufacturerIndex].image = `${default_image_url}`;
                    } else {
                        manufacturers[manufacturerIndex].image = `${cloudfront_url}${manufacturer_bucket}${image}`;
                    }
                }

            }
        }

        response.data = manufacturers;

        return response;
    }

    model.createManufacturer = async function createManufacturer(manufacturer) {

        const manufacturerSlug = slugify(manufacturer.name, { lower: true });

        const [insertId] = await link('manufacturers').insert({
            id: guid.v4(),
            active: true,
            slug: manufacturerSlug
        }, 'id');

        const {id} = insertId;

        const manufacturerMetadata = await link('manufacturers_metadata').insert([
            {id: guid.v4(), id_manufacturer: id, name: manufacturer.name, id_lang: languages.en, image: manufacturer.image},
            {id: guid.v4(), id_manufacturer: id, name: manufacturer.name_ar, id_lang: languages.ar, image: manufacturer.image_ar},
        ], '*');

        return {data: {manufacturer_id: id, manufacturer_metadata: manufacturerMetadata}};
    }

    model.deleteManufacturer = async function deleteManufacturer(id) {
        return await this.softDelete(
            {id},
            {active: false}
        );
    }

    model.updateManufacturer = async function updateManufacturer(manufacturer) {

        const {
            id: manufacturerId,
            active,
            name,
            name_ar,
            image,
            image_ar,
            description,
            description_ar,
            meta_title,
            meta_title_ar,
            meta_description,
            meta_description_ar,
            meta_keywords,
            meta_keywords_ar,
        } = manufacturer;

        // Manufacturer update
        if (active !== undefined || name) {

            const updatedFields = { updated_at: this.now() }

            if (active !== undefined) {
                updatedFields.active = active;
            }

            if (name) {
                const manufacturerSlug = slugify(name, { lower: true });
                updatedFields.slug = manufacturerSlug;
            }

            const updatedManufacturer = await this.update(updatedFields, {
                id: manufacturerId,
            });
        
            if (!updatedManufacturer?.length)
                throw new Error(`brand_not_exists`)
        }

        // Manufacturer Metadata Update
        if (name || image || description || meta_description || meta_title || meta_keywords){

            await link('manufacturers_metadata')
                .update({ name, image, description, meta_description, meta_title, meta_keywords })
                .where({ id_manufacturer: manufacturerId, id_lang: languages.en })
        }

        if (name_ar || image_ar || description_ar || meta_description_ar || meta_title_ar || meta_keywords_ar ) {

            await link('manufacturers_metadata')
                .update({ name: name_ar, image: image_ar, description: description_ar, meta_description: meta_description_ar,
                    meta_title: meta_title_ar, meta_keywords: meta_keywords_ar })
                .where({ id_manufacturer: manufacturerId, id_lang: languages.ar })
        }

        const manufacturerMetaData = await link('manufacturers_metadata')
            .where({ id_manufacturer: manufacturerId })
            .returning('*')

        if(manufacturerMetaData && manufacturerMetaData.length > 0) {
            manufacturerMetaData.map(item => {
                item.image = `${cloudfront_url}${manufacturer_bucket}${item.image}`;
            });
        }

        return { data : { id : manufacturerId, manufacturer_metadata: manufacturerMetaData } };
    }

    model.manufacturerDetail = async function manufacturerDetail(params) {

        const { id } = params;

        const manufacturer = await link('manufacturers')
            .select('active')
            .where('id', id)
            .first()

        if (!manufacturer)
            throw new Error(`brand_not_exists`)

        const manufacturerMetaData = await link('manufacturers_metadata')
            .where({ id_manufacturer: id })
            .returning('*')

        if(manufacturerMetaData && manufacturerMetaData.length > 0) {
            manufacturerMetaData.map(item => {
                item.image = `${cloudfront_url}${manufacturer_bucket}${item.image}`;
            });
        }

        return { data : {id, active: manufacturer.active, manufacturer_metadata: manufacturerMetaData } };
    }

    model.getManufacturerBySlug = async function getManufacturerBySlug(slug) {

        let response = { id_manufacturer: [] }

        let exists = await link
            .from('manufacturers as m')
            .where('slug', slug)
            .whereNull('m.deleted_at').first('id')
        
        if (exists) {
            response.id_manufacturer.push(exists.id)    
        }

        return response;
    }

    return model;
}
