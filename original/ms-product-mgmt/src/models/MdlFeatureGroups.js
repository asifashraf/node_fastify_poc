module.exports = function MdlFeatureGroups(opts) {

    const { config, baseModel, knexnest, guid} = opts;

    const model = baseModel('feature_groups');

    const { link } = model;

    const { languages } = config;

    model.getAll = async function getAll( filters, pagination, i8ln ) {

        let response = { data: null, pagination: null }

        const { active, id_feature_group, keyword } = filters;

        const { perPage, currentPage, paginate } = pagination

        let _link = link
            .select(
                'fg.id as _id',
                'fg.status as _status',
                'fgm.name as _name'
            )
            .from('feature_groups as fg')
            .innerJoin('feature_groups_metadata as fgm', 'fg.id', 'fgm.id_feature_group')
            .where('fgm.id_lang', i8ln.locale)
            .whereNull('deleted_at')
            .orderBy('fg.created_at', 'desc')

        if (active) _link = _link.where('fg.status', active)

        if (id_feature_group) _link = _link.whereIn('fg.id', id_feature_group)

        if (keyword) {
            _link = _link.where('fgm.name', 'Ilike', '%' + keyword + '%')
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

    model.createFeatureGroups = async function createFeatureGroups(featureGroup) {

        const { name, name_ar } = featureGroup;

        const itExists  = await link('feature_groups_metadata')
            .whereIn('name', [name, name_ar])
            .first('id')

        if (itExists){
            throw new Error(`feature_group_already_exists`)
        }

        const [insertId] = await link('feature_groups').insert({
            id: guid.v4(),
            status: true
        }, 'id');

        const { id } = insertId;

        const featureGroupMetadata = await link('feature_groups_metadata').insert([
            { id: guid.v4(), id_feature_group: id, name: name, id_lang: languages.en },
            { id: guid.v4(), id_feature_group: id, name: name_ar, id_lang: languages.ar },
        ], '*');

        return { data: { feature_group_id: id, feature_group_metadata : featureGroupMetadata } };
    }

    model.updateFeatureGroup = async function updateFeatureGroup(featureGroup) {

        const { id, name, name_ar, status } = featureGroup;

        const updatedFeatureGroup = await this.update({
            id,
            status,
            updated_at: this.now()
        },
        {
            id,
            deleted_at: null
        });

        if (!updatedFeatureGroup?.length){
            throw new Error(`group_not_exists`)
        }

        if (name) {
            await link('feature_groups_metadata')
                .where({ id_feature_group: id, id_lang: languages.en })
                .update({ name })
        }

        if (name_ar) {
            await link('feature_groups_metadata')
                .where({ id_feature_group: id, id_lang: languages.ar })
                .update({ name: name_ar })
        }

        const featureGroupMetadata = await link('feature_groups_metadata')
            .where({ id_feature_group: id })
            .returning('*')

        return { data: { feature_group_id: id, feature_group_metadata : featureGroupMetadata } };
    }

    model.viewFeatureGroup = async function viewFeatureGroup(id) {

        const [ featureGroup ] = await this.where(['id','status'], { id, deleted_at: null })

        if (!featureGroup)
            throw new Error(`group_not_exists`)

        const featureGroupMetadata = await link('feature_groups_metadata')
            .where({ id_feature_group: id })
            .returning('*')

        return { data: { ... featureGroup, feature_group_metadata: featureGroupMetadata } };
    }

    model.deleteFeatureGroup = async function deleteFeatureGroup(id) {
        return await this.softDelete(
            { id },
            { status: false }
        );
    }

    return model;
}
