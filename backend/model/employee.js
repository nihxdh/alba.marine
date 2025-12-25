const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    employeeId: {
        type: String,
        required: true,
        unique: true
    },
    phoneNo: {
        type: String,
        required: false
    },
    status: {
        type: Boolean,
        default: true // true = active, false = inactive
    },
    onamBata: {
        type: Number,
        default: 0,
        min: 0,
        description: 'Fixed Onam Bata tokens per employee (savings/advance)'
    }
}, {
    timestamps: true // Automatically adds createdAt and updatedAt
})

module.exports = mongoose.model("Employee", employeeSchema);