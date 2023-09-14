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

    await knex("product_statuses").insert([
        {
            id: orderStates1,
            status: "Open"
        },
        {
            id: orderStates2,
            status: "Not Available"
        },
        {
            id: orderStates3,
            status: "Ready To Ship",
        },
        {
            id: orderStates4,
            status: "Send To Consolidation Center",
        },
        {
            id: orderStates5,
            status: "Shipped",
        },
        {
            id: orderStates6,
            status: "Delivered",
        },
    ]);
};
