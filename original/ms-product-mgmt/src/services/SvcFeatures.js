module.exports = function SvcFeatures(opts) {

    const { Boom, logger, mdlFeatures, i18n } = opts;

    const getAllFeatures = async ({ filters, pagination, i8ln }) => {
        try {

            const features = await mdlFeatures.getAll( filters, pagination, i8ln );

            return features;

        } catch (ex) {
            logger.error({ msg: 'Svcfeaturesjs > getAllfeatures > error >', ex });
            throw new Boom.Boom(i18n.__(ex.message));
        }
    }

    const createFeature = async ({ feature }) => {
        try {

            const features = await mdlFeatures.createFeatures(feature);
            return features;

        } catch (ex) {
            logger.error({ msg: 'Svcfeaturesjs > createfeatures > error >', ex });
            throw new Boom.Boom(i18n.__(ex.message));
        }
    }

    const updateFeature = async ({ feature }) => {
        try {

            const features = await mdlFeatures.updateFeature(feature);
            return features;

        } catch (ex) {
            logger.error({ msg: 'Svcfeaturesjs > updateFeature > error >', ex });
            throw new Boom.Boom(i18n.__(ex.message));
        }
    }

    const deletefeature = async ({id}) => {
        try {

            const feature = await mdlFeatures.deleteFeature(id);
            return feature;

        } catch (ex) {
            logger.error({ msg: 'Svcfeaturesjs > deletefeature > error >', ex });
            throw new Boom.Boom(i18n.__(ex.message));
        }
    }

    const view = async ({id}) => {
        try {

            const feature = await mdlFeatures.view(id);
            return feature;

        } catch (ex) {
            logger.error({ msg: 'Svcfeaturesjs > view > error >', ex });
            throw new Boom.Boom(i18n.__(ex.message));
        }
    }

    return {
        getAllFeatures,
        createFeature,
        deletefeature,
        updateFeature,
        view
    }

}
