module.exports = function MdlFeatureValues(opts) {

    const { config, baseModel, knexnest, guid} = opts;

    const model = baseModel('feature_values');

    const { link } = model;

    const { languages } = config;

    model.getAll = async function getAll( filters, pagination, i8ln ) {

        let response = { data: null, pagination: null }

        const { active, id_feature, keyword } = filters;

        const { perPage, currentPage, paginate } = pagination

        let _link = link
            .select(
                'fv.id as _id',
                'fv.id_feature as _idFeature',
                'fvm.name as _name'
            )
            .from('feature_values as fv')
            .innerJoin('feature_values_metadata as fvm', 'fv.id', 'fvm.id_feature_value')
            .where('fvm.id_lang', i8ln.locale)
            .whereNull('deleted_at')
            .orderBy('fv.created_at', 'desc')

        if (active) _link = _link.where('fg.status', active)

        if (id_feature) _link = _link.whereIn('fv.id_feature', id_feature)

        if (keyword) {
            _link = _link.where('fvm.name', 'Ilike', '%' + keyword + '%')
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

    model.createFeatureValue = async function createFeatureValue(featureValue) {

        const { name, name_ar, id_feature } = featureValue

        const itExists = await link('feature_values_metadata')
                                    .whereIn('name', [name, name_ar])
                                    .first('id')

        if (itExists){
            throw new Error(`feature_value_already_exists`)
        }

        const [ insertId ] = await link('feature_values').insert({
            id: guid.v4(),
            id_feature,
        }, 'id');

        const { id } = insertId;

        const featureValueMetadata = await link('feature_values_metadata').insert([
            { id: guid.v4(), id_feature_value: id, name, id_lang: languages.en },
            { id: guid.v4(), id_feature_value: id, name: name_ar, id_lang: languages.ar },
        ], '*');

        return { data : { feature_value_id: id, feature_value_metadata : featureValueMetadata } };
    }

    model.updateFeatureValue = async function updateFeatureValue(featureValue) {

        const { id, name, name_ar, id_feature, active } = featureValue;

        if (id_feature) {
            const itExists = await link('features')
                                .where('id', id_feature)
                                .first('id')
            if (!itExists) {
                throw new Error(`feature_not_exists`)
            }
        }

        const updatedFeatureValue = await this.update({
            id_feature,
            active,
            updated_at: this.now()
        },
        {
            id,
            deleted_at: null
        });

        if (!updatedFeatureValue?.length){
            throw new Error(`feature_value_not_exists`)
        }

        if (name) {
            await link('feature_values_metadata')
                .where({ id_feature_value: id, id_lang: languages.en })
                .update({ name })
        }

        if (name_ar) {
            await link('feature_values_metadata')
                .where({ id_feature_value: id, id_lang: languages.ar })
                .update({ name: name_ar })
        }

        const featureValueMetadata = await link('feature_values_metadata')
            .where({ id_feature_value: id })
            .returning('*')

        return { data: { feature_id: id, features_metadata: featureValueMetadata } };
    }

    model.deleteFeatureValue = async function deleteFeatureValue(id) {
        const [deletedId] = await this.softDelete(
            { id },
            { active: false }
        );

        return {data: deletedId}
    }

    model.viewFeatureValue = async function viewFeatureValue(id) {

        const [ featureValue ] = await this.where(['id', 'active', 'id_feature'], { id, deleted_at: null })

        if (!featureValue)
            throw new Error(`feature_value_not_exists`)

        const featureValueMetadata = await link('feature_values_metadata')
            .where({ id_feature_value: id })
            .returning('*')

        return { data: { ... featureValue, feature_value_metadata: featureValueMetadata } };
    }

    return model;
}
