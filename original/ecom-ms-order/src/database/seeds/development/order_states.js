/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
const { v4: uuidv4 } = require("uuid");


exports.seed = async function (knex) {

    let orderStates1 = uuidv4();
    let orderStates2 = uuidv4();
    let orderStates3 = uuidv4();
    let orderStates4 = uuidv4();
    let orderStates5 = uuidv4();
    let orderStates6 = uuidv4();
    let orderStates7 = uuidv4();
    let orderStates8 = uuidv4();
    let orderStates9 = uuidv4();
    let orderStates10 = uuidv4();
    let orderStates11 = uuidv4();

    await knex("order_states").insert([
        {
            id: orderStates1,
            color: "yellow",
            name: "Process In Progress",
            name_ar: "Process In Progress"
        },
        {
            id: orderStates2,
            color: "green",
            name: "Awaiting Fulfilment",
            name_ar: "Awaiting Fulfilment"
        },
        {
            id: orderStates3,
            color: "red",
            name: "Awaiting Pickup",
            name_ar: "Awaiting Pickup"
        },
        {
            id: orderStates4,
            color: "red",
            name: "Send To Consolidation Center",
            name_ar: "Send To Consolidation Center"
        },
        {
            id: orderStates5,
            color: "yellow",
            name: "Awaiting Shipment",
            name_ar: "Awaiting Shipment"
        },
        {
            id: orderStates6,
            color: "orange",
            name: "Shipped",
            name_ar: "Shipped"
        },
        {
            id: orderStates7,
            color: "green",
            name: "Delivered",
            name_ar: "Delivered"
        },
        {
            id: orderStates8,
            color: "red",
            name: "Payment Failure",
            name_ar: "Payment Failure"
        },
        {
            id: orderStates9,
            color: "red",
            name: "Cancelled",
            name_ar: "Cancelled"
        },
        {
            id: orderStates10,
            color: "blue",
            name: "Refund",
            name_ar: "Refund"
        },
        {
            id: orderStates11,
            color: "yellow",
            name: "Payment In Process",
            name_ar: "Payment In process"
        }
    ]);
};
