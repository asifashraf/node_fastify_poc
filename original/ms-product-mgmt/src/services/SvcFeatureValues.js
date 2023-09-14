module.exports = function SvcFeatureValues(opts) {

    const { Boom, logger, mdlFeatureValues, i18n } = opts;

    const getAllFeatureValues = async ({ filters, pagination, i8ln }) => {
        try {

            const feature_values = await mdlFeatureValues.getAll( filters, pagination, i8ln );

            return feature_values;

        } catch (ex) {
            logger.error({ msg: 'SvcfeaturesValuesjs > getAllfeatureValues > error >', ex });
            throw new Boom.Boom(i18n.__(ex.message));
        }
    }

    const createFeatureValue = async ({ featureValue }) => {
        try {

            const feature_values = await mdlFeatureValues.createFeatureValue(featureValue);
            return feature_values;

        } catch (ex) {
            logger.error({ msg: 'SvcfeatureValuesjs > createfeatureValues > error >', ex });
            throw new Boom.Boom(i18n.__(ex.message));
        }
    }

    const updateFeatureValue = async ({ featureValue }) => {
        try {

            const feature_values = await mdlFeatureValues.updateFeatureValue(featureValue);
            return feature_values;

        } catch (ex) {
            logger.error({ msg: 'SvcfeatureValuesjs > updateFeatureValue > error >', ex });
            throw new Boom.Boom(i18n.__(ex.message));
        }
    }

    const deleteFeatureValue = async ({id}) => {
        try {

            const feature_value = await mdlFeatureValues.deleteFeatureValue(id);
            return feature_value;

        } catch (ex) {
            logger.error({ msg: 'SvcfeatureValuesjs > deletefeatureValue > error >', ex });
            throw new Boom.Boom(i18n.__(ex.message));
        }
    }

    const viewFeatureValue = async ({id}) => {
        try {

            const featureValue = await mdlFeatureValues.viewFeatureValue(id);
            return featureValue;

        } catch (ex) {
            logger.error({ msg: 'SvcfeatureValuesjs > view > error >', ex });
            throw new Boom.Boom(i18n.__(ex.message));
        }
    }

    return {
        getAllFeatureValues,
        createFeatureValue,
        deleteFeatureValue,
        updateFeatureValue,
        viewFeatureValue
    }

}
