const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const DailyToken = require('../model/dailyToken');
const Employee = require('../model/employee');

// Add or update daily tokens for an employee
router.post('/daily', adminAuth, async (req, res) => {
    try {
        const { employeeId, date, tokens, bata } = req.body;

        // Validate required fields
        if (!employeeId || !date || tokens === undefined) {
            return res.status(400).json({
                success: false,
                message: 'employeeId, date, and tokens are required'
            });
        }

        // Validate tokens is a non-negative number
        if (tokens < 0) {
            return res.status(400).json({
                success: false,
                message: 'Tokens must be 0 or greater'
            });
        }

        // Get employee details
        const employee = await Employee.findById(employeeId);
        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        // Create or update token record with employee details
        const tokenRecord = await DailyToken.findOneAndUpdate(
            { employeeId, date: new Date(date) },
            { 
                tokens,
                bata: bata || false,
                employeeName: employee.name
            },
            { upsert: true, new: true }
        );

        res.status(200).json({
            success: true,
            message: 'Token record saved successfully',
            data: tokenRecord
        });

    } catch (error) {
        console.error('Error saving token record:', error);
        res.status(500).json({
            success: false,
            message: 'Error saving token record'
        });
    }
});

// Get all token records
router.get('/all', adminAuth, async (req, res) => {
    try {
        const tokens = await DailyToken.find({}).sort({ date: -1 });

        res.status(200).json({
            success: true,
            message: 'Token records retrieved successfully',
            count: tokens.length,
            data: tokens
        });

    } catch (error) {
        console.error('Error fetching token records:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching token records'
        });
    }
});

// Get token records for a specific employee
router.get('/employee/:employeeId', adminAuth, async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { limit = 30 } = req.query; // Default to last 30 records

        const tokens = await DailyToken.find({ 
            employeeId 
        }).sort({ date: -1 })
        .limit(parseInt(limit));

        res.status(200).json({
            success: true,
            message: 'Employee token records retrieved successfully',
            count: tokens.length,
            data: tokens
        });

    } catch (error) {
        console.error('Error fetching employee token records:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching employee token records'
        });
    }
});

// Update token record for specific employee and date
router.put('/daily/:employeeId/:date', adminAuth, async (req, res) => {
    try {
        const { employeeId, date } = req.params;
        const { tokens, bata } = req.body;

        // Validate required fields
        if (tokens === undefined) {
            return res.status(400).json({
                success: false,
                message: 'tokens field is required'
            });
        }

        // Validate tokens is a non-negative number
        if (tokens < 0) {
            return res.status(400).json({
                success: false,
                message: 'Tokens must be 0 or greater'
            });
        }

        // Prepare update object
        const updateData = { tokens };
        if (bata !== undefined) {
            updateData.bata = bata;
        }

        // Find and update the token record
        const tokenRecord = await DailyToken.findOneAndUpdate(
            { employeeId, date: new Date(date) },
            updateData,
            { new: true }
        );

        if (!tokenRecord) {
            return res.status(404).json({
                success: false,
                message: 'Token record not found for this employee and date'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Token record updated successfully',
            data: tokenRecord
        });

    } catch (error) {
        console.error('Error updating token record:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating token record'
        });
    }
});

// Delete token record for specific employee and date
router.delete('/daily/:employeeId/:date', adminAuth, async (req, res) => {
    try {
        const { employeeId, date } = req.params;

        // Find and delete the token record
        const tokenRecord = await DailyToken.findOneAndDelete({
            employeeId,
            date: new Date(date)
        });

        if (!tokenRecord) {
            return res.status(404).json({
                success: false,
                message: 'Token record not found for this employee and date'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Token record deleted successfully',
            data: {
                deletedRecord: {
                    employeeId: tokenRecord.employeeId,
                    employeeName: tokenRecord.employeeName,
                    date: tokenRecord.date,
                    tokens: tokenRecord.tokens
                }
            }
        });

    } catch (error) {
        console.error('Error deleting token record:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting token record'
        });
    }
});

module.exports = router;
