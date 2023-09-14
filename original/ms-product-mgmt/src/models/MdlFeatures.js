module.exports = function MdlFeatures(opts) {

    const { config, baseModel, knexnest, guid} = opts;

    const model = baseModel('features');

    const { link } = model;

    const { languages } = config;

    model.getAll = async function getAll( filters, pagination, i8ln ) {

        let response = { data: null, pagination: null }

        const { id_feature_group, keyword } = filters;

        const { perPage, currentPage, paginate } = pagination

        let _link = link
            .select(
                'f.id as _id',
                'f.id_feature_group as _idFeatureGroup',
                'fm.name as _name'
            )
            .from('features as f')
            .innerJoin('features_metadata as fm', 'f.id', 'fm.id_feature')
            .where('fm.id_lang', i8ln.locale)
            .whereNull('deleted_at')
            .orderBy('f.created_at', 'desc')

        if (id_feature_group) _link = _link.whereIn('f.id_feature_group', id_feature_group)

        if (keyword) {
            _link = _link.where('fm.name', 'Ilike', '%' + keyword + '%')
        }

        if (paginate)
            _link = _link.paginate({ perPage, currentPage, isLengthAware : true });

        let result = await _link;

        if (paginate) {
            response.data = knexnest.nest(result.data);
            response.pagination = result.pagination;
        } else {
            response.data = knexnest.nest(result);
        }

        return response;
    }

    model.createFeatures = async function createFeatures(feature) {

        const { name, name_ar, id_feature_group } = feature;

        const itExists  = await link('features_metadata')
            .whereIn('name', [name, name_ar])
            .first('id')

        if (itExists){
            throw new Error(`feature_already_exists`)
        }

        const [insertId] = await link('features').insert({
            id: guid.v4(),
            id_feature_group: id_feature_group
        }, 'id');

        const { id } = insertId;

        const featuresMetadata = await link('features_metadata').insert([
            { id: guid.v4(), id_feature: id, name: name, id_lang: languages.en },
            { id: guid.v4(), id_feature: id, name: name_ar, id_lang: languages.ar },
        ], '*');

        return { data: { feature_id: id, features_metadata: featuresMetadata } };
    }

    model.updateFeature = async function updateFeature(feature) {

        const { id, name, name_ar, id_feature_group, active } = feature;

        if (id_feature_group) {
            const itExists = await link('feature_groups')
                                .where('id', id_feature_group)
                                .first('id')
            if (!itExists) {
                throw new Error(`group_not_exists`)
            }
        }

        const updatedFeature = await this.update({
            id_feature_group,
            active,
            updated_at: this.now()
        },
        {
            id,
            deleted_at: null
        });

        if (!updatedFeature?.length){
            throw new Error(`feature_not_exists`)
        }

        if (name) {
             await link('features_metadata')
                .where({ id_feature: id, id_lang: languages.en })
                .update({ name })
        }

        if (name_ar) {
            await link('features_metadata')
                .where({ id_feature: id, id_lang: languages.ar })
                .update({ name: name_ar })
        }

        const featureMetadata = await link('features_metadata')
                .where({ id_feature: id })
                .returning('*')

        return { data: { feature_id: id, features_metadata: featureMetadata } };
    }

    model.deleteFeature = async function deleteFeature(id) {

        const [deletedId] = await this.softDelete(
            { id },
            { active: false }
        );

        return {data: deletedId}
    }

    model.view = async function view(id) {

        const [ feature ] = await this.where(['id','active','id_feature_group'], { id, deleted_at: null })

        if (!feature)
            throw new Error(`feature_not_exists`)

        const featureMetadata = await link('features_metadata')
            .where({ id_feature: id })
            .returning('*')

        return { data: { ... feature, features_metadata: featureMetadata } };

    }

    return model;
}
