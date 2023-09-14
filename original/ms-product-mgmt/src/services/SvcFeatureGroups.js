module.exports = function SvcFeatureGroups(opts) {

    const { Boom, logger, mdlFeatureGroups, i18n } = opts;

    const getAllFeatureGroups = async ({ filters, pagination, i8ln }) => {
        try {

            const featureGroups = await mdlFeatureGroups.getAll( filters, pagination, i8ln );

            return featureGroups;

        } catch (ex) {
            logger.error({ msg: 'SvcFeatureGroupsjs > getAllFeatureGroups > error >', ex });
            throw new Boom.Boom(i18n.__(ex.message));
        }
    }

    const createFeatureGroups = async ({ featureGroup }) => {
        try {

            const featureGroups = await mdlFeatureGroups.createFeatureGroups(featureGroup);
            return featureGroups;

        } catch (ex) {
            logger.error({ msg: 'SvcFeatureGroupsjs > createFeatureGroups > error >', ex });
            throw new Boom.Boom(i18n.__(ex.message));

        }
    }

    const updateFeatureGroup = async ({ featureGroup }) => {
        try {

            const featureGroups = await mdlFeatureGroups.updateFeatureGroup(featureGroup);
            return featureGroups;

        } catch (ex) {
            logger.error({ msg: 'SvcFeatureGroupsjs > updateFeatureGroup > error >', ex });
            throw new Boom.Boom(i18n.__(ex.message));
        }
    }

    const viewFeatureGroup = async ({ id }) => {
        try {

            const featureGroup = await mdlFeatureGroups.viewFeatureGroup(id)
            return featureGroup

        } catch (ex) {
            logger.error({ msg: 'SvcFeatureGroupsjs > viewFeatureGroup > error >', ex });
            throw new Boom.Boom(i18n.__(ex.message));
        }
    }

    const deleteFeatureGroup = async ({id}) => {
        try {

            const featureGroup = await mdlFeatureGroups.deleteFeatureGroup(id);
            return featureGroup;

        } catch (ex) {
            logger.error({ msg: 'SvcFeatureGroupsjs > deleteFeatureGroup > error >', ex });
            throw new Boom.Boom(i18n.__(ex.message));
        }
    }

    return {
        getAllFeatureGroups,
        createFeatureGroups,
        deleteFeatureGroup,
        updateFeatureGroup,
        viewFeatureGroup,
    }

}
