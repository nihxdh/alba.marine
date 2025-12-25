const mongoose = require("mongoose");

const billingSchema = new mongoose.Schema({
    billNo: {
        type: String,
        required: true
    },
    date: {
        type: Date
    },
    wholeCount: {
        type: String,
        required: false
    },
    vehicleNo: {
        type: String,
        required: true
    },
    purchaseSpot: {
        type: String,
        required: false
    },
    boxCount: {
        type: String,
        required: false
    },
    MeatDetails: [
        {
            varity: {
                type: String,
                required: true
            },
            count: {
                type: String,
                required: true
            },
            weight: [
                {
                    kgs: {
                        type: String,
                        required: true
                    },
                    grams: {
                        type: String,
                        required: true
                    }
                }
            ],
            noOfBox: {
                type: String,
                required: true
            },
            totalWeight: {
                type: String
            },
            totalNoBox: {
                type: String
            }           
        }
    ]
})

module.exports = mongoose.model("Billing", billingSchema);