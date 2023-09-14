import {axios} from 'axios';

module.exports = function mdlSupplierStatus(opts) {

    const { baseModel, guid, mdlOrders, httpRequest, config, constants } = opts;

    const { API_URLS, SUPPLIER_STATUS, PRODUCT_STATUS } = constants;

    const model = baseModel('supplier_statuses');

    const { link } = model;

    model.getAllSupplierStatus = async function getAllSupplierStatus() {

        // Find supplier_statuses that are not deleted
        const statuses = await this.where(['id', 'status'], { deleted_at: null })

        return { data: statuses }
    }



    /** Send Push Notifications with respect to status
     * order statuses (left most)
     * 58103d39-03b4-4e61-8ed6-567405a493d9    yellow    Awaiting Shipment    Awaiting Shipment    Awaiting Shipment    2022-10-27 13:22:53.717 +0500    2022-10-27 13:22:53.717 +0500
     * d3e69e9f-afaa-4ebf-aabb-a12a01f1750e    green    Delivered    Delivered    Delivered    2022-10-27 13:22:53.717 +0500    2022-10-27 13:22:53.717 +0500
     * dfe81d0e-acdc-4465-a0d8-dada96e3cd63    red    Payment Failure    Payment Failure    Payment Failure    2022-10-27 13:22:53.717 +0500    2022-10-27 13:22:53.717 +0500
     * 13d518d2-14fb-4014-a19a-efe21a74066e    red    Cancelled    Cancelled    Cancelled    2022-10-27 13:22:53.717 +0500    2022-10-27 13:22:53.717 +0500
     * 499265bb-c3d2-4cc5-bfea-dd5d3376f266    yellow    Payment In Process    Payment in process AR    Payment in process TR    2022-10-27 13:22:53.717 +0500    2022-10-27 13:22:53.717 +0500
     * 4f2389de-fb6c-4902-a155-c08641108dd2    orange    Process In Progress    Process In Progress    Process In Progress    2022-10-27 13:22:53.717 +0500    2022-10-27 13:22:53.717 +0500
     * 0937d88d-57f8-4086-8cac-dc85a4c6d80b    yellow    Awaiting Pickup    Awaiting Pickup    Awaiting Pickup    2022-10-27 13:22:53.717 +0500    2022-10-27 13:22:53.717 +0500
     * 5387da96-0773-4191-af92-f09cbe04098e    yellow    Send To Consolidation Center    Send To Consolidation Center    Send To Consolidation Center    2022-10-27 13:22:53.717 +0500    2022-10-27 13:22:53.717 +0500
     * ec465358-a1b1-44e3-a298-a14079f86825    green    Shipped    Shipped    Shipped    2022-10-27 13:22:53.717 +0500    2022-10-27 13:22:53.717 +0500
     * 912853f4-9d0e-4b87-92ec-90e4254f20d8    green    Refund    Refund    Refund    2022-10-27 13:22:53.717 +0500    2022-10-27 13:22:53.717 +0500
     * 861e54a1-0a04-4f9c-92b1-8b1763ef8a78    yellow    Awaiting Fulfillment    Awaiting Fulfillment    Awaiting Fulfillment    2022-10-27 13:22:53.717 +0500    2022-10-27 13:22:53.717 +0500

     * supplier status (mid)
     * 4f2389de-fb6c-4902-a155-c08641108dd1    New    2022-12-23 18:35:45.129 +0500    2022-12-23 18:35:45.129 +0500
     * 4f2389de-fb6c-4902-a155-c08641108dd2    Waiting for PickUp    2022-12-23 18:35:45.129 +0500    2022-12-23 18:35:45.129 +0500
     * 4f2389de-fb6c-4902-a155-c08641108dd3    Sent to Consolidated Center    2022-12-23 18:35:45.129 +0500    2022-12-23 18:35:45.129 +0500
     * 4f2389de-fb6c-4902-a155-c08641108dd4    Cancelled    2022-12-23 18:35:45.129 +0500    2022-12-23 18:35:45.129 +0500
     * 4f2389de-fb6c-4902-a155-c08641108dd5    Shipped To Customer    2022-12-23 18:35:45.129 +0500    2022-12-23 18:35:45.129 +0500
     * 4f2389de-fb6c-4902-a155-c08641108dd6    Delivered    2022-12-23 18:35:45.129 +0500    2022-12-23 18:35:45.129 +0500

     * product statuses (right)
     * 638f6f60-7826-442a-bde6-92138252a300        Not Available    2022-10-27 13:22:53.723 +0500    2022-10-27 13:22:53.723 +0500
     * e99c3605-be08-49d2-8f67-0db7d10bead9        Ready To Ship    2022-10-27 13:22:53.723 +0500    2022-10-27 13:22:53.723 +0500    2022-10-27 13:22:53.723 +0500
     * 357ee402-c5d6-4192-9082-8d13adbd7f9a        Shipped    2022-10-27 13:22:53.723 +0500    2022-10-27 13:22:53.723 +0500    2022-10-27 13:22:53.723 +0500
     * 8def874c-bfaa-40c1-a192-2161b479623f        Delivered    2022-10-27 13:22:53.723 +0500    2022-10-27 13:22:53.723 +0500    2022-10-27 13:22:53.723 +0500
     * eea172d5-312b-450f-be7b-3e0ad5589d4e        Send To Consolidation Center    2022-10-27 13:22:53.723 +0500    2022-10-27 13:22:53.723 +0500    2022-10-27 13:22:53.723 +0500
     * e99c3605-be08-49d2-8f67-0db7d10beac9        "Fulfilled"    2022-10-27 13:22:53.723 +0500    2022-10-27 13:22:53.723 +0500
     * 1dd67915-5708-4b29-b296-48deb8e86be7        Action Required    2022-10-27 13:22:53.723 +0500    2022-10-27 13:22:53.723 +0500
     *
     * Base Model: supplier_statuses
     * */
    model.supplierOrderStatusUpdate = async function supplierOrderStatusUpdate(order) {

        // Find supplier_statuses that are not deleted by status id
        const [ status ] = await this.where(['id','status'], { id: order.id_status, deleted_at: null })

        // Throw error if  status not found
        if (!status) {
            throw new Error(`Invalid supplier status.`)
        }

        // update order status
        const [ _order ]  = await link('order_supplier_status')
            .update({ id_status: order.id_status, updated_at: this.now() })
            .where({ id_order: order.id_order, id_supplier: order.id_supplier })
            .returning(['id_order','id_supplier']);

        if(
            order.id_status === SUPPLIER_STATUS.SENT_TO_CONSOLIDATION_CENTER ||
            order.id_status === SUPPLIER_STATUS.SHIPPED_TO_CUSTOMER ||
            order.id_status === SUPPLIER_STATUS.DELIVERED
        ){
            // Load order product status by order id
            const orderProductStatuses = await link('order_product_status')
                .where({ id_order: order.id_order});

            // Delivered items
            let deliveredItems = [];

            // Loop through order product statuses
            for (let i = 0; i < orderProductStatuses.length; i++) {
                // Loop item
                const item = orderProductStatuses[i];
                if(item.status === PRODUCT_STATUS.DELIVERED){
                    deliveredItems.push(item);
                }
            }

            // Send HTTP request to on demand app
            if(deliveredItems.length > 0){
                const payload = {
                    order_id: order.id_order,
                    delivered_items: deliveredItems
                }

                const { cofeDistrictUrl } = config;


                await httpRequest.send({
                    path: `${cofeDistrictUrl}${API_URLS.SEND_WHATSAPP_NOTIFICATION_ON_DELIVERY}`,
                    method: 'POST',
                    params: payload,
                    json: true
                });
            }

        }


        if (!_order) {
            throw new Error(`Supplier not found.`)
        }

        return { data: { ... _order, status } }
    }

    model.updateSupplierTrackingInfo = async function updateSupplierTrackingInfo(tracking) {

        const { id_order, id_supplier, id_carrier_partner, tracking_url, tracking_number, awb_filepath } = tracking

        const [ supplierOrderTracking ] = await link('order_supplier_shipments')
            .insert({
                id: guid.v4(),
                id_order,
                id_supplier,
                id_carrier_partner,
                tracking_url,
                tracking_number,
                awb_filepath
            })
            .onConflict(['id_order', 'id_supplier'])
            .merge(
                { tracking_url, tracking_number, id_carrier_partner, awb_filepath, updated_at: this.now() }
            )
            .returning("*");

        if (!supplierOrderTracking) {
            throw new Error(`Unable to add suoplier tracking info.`)
        }

        return { data: supplierOrderTracking }
    }

    model.salasaTrackingWebhook = async function salasaTrackingWebhook(order) {

        let { id_order, id_supplier, status, partner_name, tracking_url, tracking_number, awb_filepath } = order

        if (status === "Shipped") {
            status = "Shipped To Customer";

            const shippedStatus = await link('order_states').select('id', 'name').where('name', 'Shipped').first();

            await link('orders').update({ current_state: shippedStatus.id }).where({ id: id_order }).returning('*')
        }

        const [ availableStatus ] = await this.where(['id','status'], { status: status, deleted_at: null })

        if (!availableStatus) {
            throw new Error(`Invalid status.`)
        }

        const [ statusUpdated ]  = await link('order_supplier_status')
            .update({ id_status: availableStatus.id, updated_at: this.now() })
            .where({ id_order: id_order, id_supplier: id_supplier })
            .returning(['id_order','id_supplier'])

        if (!statusUpdated)
            throw new Error(`Supplier not found.`)


        if (partner_name && tracking_number) {

            let deliveryPartner = await mdlOrders.getDeliveryPartner(null, null, partner_name)

            if (!deliveryPartner)
                throw new Error(`Delivery Partner is Invalid.`)

            let id_carrier_partner = deliveryPartner[0]['id'];

            const [ supplierOrderTracking ] = await link('order_supplier_shipments')
                .insert({
                    id: guid.v4(),
                    id_order,
                    id_supplier,
                    id_carrier_partner,
                    tracking_url,
                    tracking_number,
                    awb_filepath
                })
                .onConflict(['id_order', 'id_supplier'])
                .merge(
                    { tracking_url, tracking_number, id_carrier_partner, awb_filepath, updated_at: this.now() }
                )
                .returning("*");

            if (!supplierOrderTracking) {
                throw new Error(`Unable to add supplier tracking info.`)
            }
        }

        return { data: order }
    }

    return model;
}
