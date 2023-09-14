module.exports = function MdlProductStatus(opts) {

    const { baseModel, guid, config, constants, httpRequest } = opts;

    const model = baseModel('product_statuses');

    const { link } = model;

    const { productModuleUrl } = config;

    const { API_URLS } = constants;

    model.getAll = async function getAll() {

        const statuses = await this.where(['id','color','status'], { deleted_at: null })

        if (!statuses.length)
            throw new Error(`product_statuses_not_exists`)

        return { data: statuses }
    }

    model.update = async function update(order) {

        const [ status ] = await this.where(['id','color','status'], { id: order.id_status, deleted_at: null })

        if (!status) {
            throw new Error(`Invalid product status.`)
        }

        const [ _order ]  = await link('order_product_status')
                    .update({ status: order.id_status })
                    .where({ id_order: order.id_order, id_product: order.id_product, id_product_attribute: order.id_product_attribute  })
                    .returning(['id_order','id_product','id_product_attribute'])

        if (!_order) {
            throw new Error(`Product not found.`)
        }

        /** Supplier Order Status Update */

        const supplierId = await link('order_details')
            .where({ id_order: order.id_order, id_product: order.id_product, id_product_attribute: order.id_product_attribute })
            .pluck('id_supplier')

        const supplierOrderProducts = await link('order_details')
            .select('id_order','id_product','id_product_attribute')
            .where({ id_order: order.id_order, id_supplier: supplierId[0] })

        let New = false;
        let Fulfilled = false;
        let Cancelled = false;

        for (let product of supplierOrderProducts) {

            const productStatus = await link('order_product_status as ops')
                .innerJoin('product_statuses as ps', 'ops.status', 'ps.id')
                .where({ 'ops.id_order': order.id_order, 'ops.id_product': product.id_product,
                    'ops.id_product_attribute': product.id_product_attribute
                }).first('ps.id','ps.status')

            if (productStatus.status === 'Action Required') {
                New = true;
                Fulfilled = false;
                Cancelled = false;
                break;
            }

            if (productStatus.status === 'Fulfilled') {
                Fulfilled = true;
                Cancelled = false;
            }

            if (productStatus.status === 'Not Available') {
                Cancelled = true;
            }
        }

        let updatedState = { 'id': 'N/A' };

        if (New) {
            updatedState = await link.from('supplier_statuses').where('status', 'New').first('id')
        } else if (Fulfilled) {
            updatedState = await link.from('supplier_statuses').where('status', 'Waiting for PickUp').first('id')
        } else if (Cancelled) {
            updatedState = await link.from('supplier_statuses').where('status', 'Cancelled').first('id')
        }

        await link('order_supplier_status').insert({
            id: guid.v4(),
            id_order: order.id_order,
            id_supplier: supplierId[0],
            id_status: updatedState.id
        }, '*').onConflict(['id_order', 'id_supplier']).merge(
            { id_status: updatedState.id }
        );

        return { data: { ... _order, status } }
    }

    model.getSuppliers = async function getSuppliers(supplierIds) {

        let suppliers = await httpRequest.send({
            path: `${productModuleUrl}${API_URLS.BULK_SUPPLIERS}`,
            method: 'POST',
            params: { id_suppliers: supplierIds },
            json: true
        });

        return suppliers;
    }

    return model
}
