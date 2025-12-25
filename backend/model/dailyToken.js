const mongoose = require("mongoose");

const dailyTokenSchema = new mongoose.Schema({
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },
    employeeName: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    tokens: {
        type: Number,
        required: true,
        min: 0
    },
    bata: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Ensure one entry per employee per day
dailyTokenSchema.index({ employeeId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("DailyToken", dailyTokenSchema);
