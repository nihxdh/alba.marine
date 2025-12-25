const express = require('express');
const Billing = require('../model/billing');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();

// 🔧 CREATE - Create a new bill (Protected route)
router.post('/bills', adminAuth, async (req, res) => {
    try {
        const {
            billNo,
            date,
            wholeCount,
            vehicleNo,
            purchaseSpot,
            boxCount,
            MeatDetails
        } = req.body;

        // Validate required fields
        if (!billNo || !vehicleNo) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: billNo and vehicleNo'
            });
        }

        // Check if bill number already exists
        const existingBill = await Billing.findOne({ billNo });
        if (existingBill) {
            return res.status(409).json({
                success: false,
                message: 'Bill number already exists'
            });
        }

        // Create new bill
        const newBill = new Billing({
            billNo,
            date: date || new Date(),
            wholeCount,
            vehicleNo,
            purchaseSpot,
            boxCount,
            MeatDetails: MeatDetails || []
        });

        const savedBill = await newBill.save();

        console.log('📝 New bill created:', savedBill.billNo);

        res.status(201).json({
            success: true,
            message: 'Bill created successfully',
            data: savedBill
        });

    } catch (error) {
        console.error('❌ Error creating bill:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating bill',
            error: error.message
        });
    }
});

// 📖 READ - Get all bills (Protected route)
router.get('/bills', adminAuth, async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            sortBy = 'date', 
            sortOrder = 'desc',
            search,
            startDate,
            endDate
        } = req.query;

        // Build filter object
        let filter = {};
        
        // Search functionality
        if (search) {
            filter.$or = [
                { billNo: { $regex: search, $options: 'i' } },
                { vehicleNo: { $regex: search, $options: 'i' } },
                { purchaseSpot: { $regex: search, $options: 'i' } }
            ];
        }

        // Date range filter
        if (startDate || endDate) {
            filter.date = {};
            if (startDate) filter.date.$gte = new Date(startDate);
            if (endDate) filter.date.$lte = new Date(endDate);
        }

        // Build sort object
        const sortObject = {};
        sortObject[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Execute query with pagination
        const bills = await Billing.find(filter)
            .sort(sortObject)
            .skip(skip)
            .limit(parseInt(limit))
            .select('-__v');

        // Get total count for pagination
        const totalBills = await Billing.countDocuments(filter);
        const totalPages = Math.ceil(totalBills / parseInt(limit));

        res.status(200).json({
            success: true,
            message: 'Bills retrieved successfully',
            data: bills,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalBills,
                hasNextPage: parseInt(page) < totalPages,
                hasPrevPage: parseInt(page) > 1
            },
            filters: {
                search: search || null,
                startDate: startDate || null,
                endDate: endDate || null,
                sortBy,
                sortOrder
            }
        });

    } catch (error) {
        console.error('❌ Error fetching bills:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching bills',
            error: error.message
        });
    }
});

// 📖 READ - Get single bill by ID (Protected route)
router.get('/bills/:id', adminAuth, async (req, res) => {
    try {
        const bill = await Billing.findById(req.params.id).select('-__v');
        
        if (!bill) {
            return res.status(404).json({
                success: false,
                message: 'Bill not found'
            });
        }

        console.log('📄 Bill retrieved:', bill.billNo);

        res.status(200).json({
            success: true,
            message: 'Bill retrieved successfully',
            data: bill
        });

    } catch (error) {
        console.error('❌ Error fetching bill:', error);
        
        if (error.kind === 'ObjectId') {
            return res.status(400).json({
                success: false,
                message: 'Invalid bill ID format'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error fetching bill',
            error: error.message
        });
    }
});


// 🔄 UPDATE - Update bill by ID (Protected route)
router.put('/bills/:id', adminAuth, async (req, res) => {
    try {
        const {
            billNo,
            date,
            wholeCount,
            vehicleNo,
            purchaseSpot,
            boxCount,
            MeatDetails
        } = req.body;

        // Validate required fields
        if (!billNo || !vehicleNo) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: billNo and vehicleNo'
            });
        }

        // Check if bill exists
        const existingBill = await Billing.findById(req.params.id);
        if (!existingBill) {
            return res.status(404).json({
                success: false,
                message: 'Bill not found'
            });
        }

        // Check if new bill number conflicts with other bills
        if (billNo !== existingBill.billNo) {
            const billNumberExists = await Billing.findOne({ 
                billNo, 
                _id: { $ne: req.params.id } 
            });
            
            if (billNumberExists) {
                return res.status(409).json({
                    success: false,
                    message: 'Bill number already exists'
                });
            }
        }

        // Update bill
        const updatedBill = await Billing.findByIdAndUpdate(
            req.params.id,
            {
                billNo,
                date: date || existingBill.date,
                wholeCount,
                vehicleNo,
                purchaseSpot,
                boxCount,
                MeatDetails: MeatDetails || existingBill.MeatDetails
            },
            { new: true, runValidators: true }
        ).select('-__v');

        console.log('🔄 Bill updated:', updatedBill.billNo);

        res.status(200).json({
            success: true,
            message: 'Bill updated successfully',
            data: updatedBill
        });

    } catch (error) {
        console.error('❌ Error updating bill:', error);
        
        if (error.kind === 'ObjectId') {
            return res.status(400).json({
                success: false,
                message: 'Invalid bill ID format'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error updating bill',
            error: error.message
        });
    }
});

// 🗑️ DELETE - Delete bill by ID (Protected route)
router.delete('/bills/:id', adminAuth, async (req, res) => {
    try {
        const bill = await Billing.findByIdAndDelete(req.params.id);
        
        if (!bill) {
            return res.status(404).json({
                success: false,
                message: 'Bill not found'
            });
        }

        console.log('🗑️ Bill deleted:', bill.billNo);

        res.status(200).json({
            success: true,
            message: 'Bill deleted successfully',
            data: {
                billNo: bill.billNo,
                deletedAt: new Date()
            }
        });

    } catch (error) {
        console.error('❌ Error deleting bill:', error);
        
        if (error.kind === 'ObjectId') {
            return res.status(400).json({
                success: false,
                message: 'Invalid bill ID format'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error deleting bill',
            error: error.message
        });
    }
});



module.exports = router;
