module.exports = function SvcVariants(opts) {

    const { Boom, logger, mdlVariants, i18n } = opts;

    const getAllVariants = async ({ i8ln }) => {
        try {

            const variants = await mdlVariants.getAllVariants(i8ln);

            return variants;

        } catch (ex) {
            logger.error({ msg: 'SvcVariantsjs > getAllVariants > error >', ex });
            throw new Boom.Boom(i18n.__(ex.message));
        }
    }

    return {
        getAllVariants,
    }

}
