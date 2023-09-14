module.exports = function MdlVariants(opts) {

    const { baseModel, _ : { groupBy } } = opts;

    const model = baseModel();

    const { link } = model;

    model.getAllVariants = async function getAllVariants(i8ln) {

        let _link = link
            .select(
                'attr_g.id as groupId',
                'attr_g.group_type as groupType',
                'attr_g.position as groupPosition',
                'attr_g.name as groupName',
            )
            .from('attribute_groups as attr_g')
            .where('attr_g.id_lang', i8ln.locale)

        let attribute_groups = await _link;

        _link = link
            .select(
                'attr.id_attribute_group as attributeGroupId',
                'attr.id as attributeId',
                'attr.position as attributePosition',
                'attr.name as attributeName',
                'attr.code as attributeCode',
            )
            .from('attributes as attr')
            .where('attr.id_lang', i8ln.locale)

        let attributes = await _link;

        if (attributes?.length) {
            attributes = groupBy(attributes,'attributeGroupId')

            for (const group of attribute_groups) {
                group.attributes = attributes[group.groupId]
            }
        }

        const variants = attribute_groups

        return { data: variants }
    }

    return model;
}
