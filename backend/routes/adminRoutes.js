const express = require('express');
const jwt = require('jsonwebtoken');
const Employee = require('../model/employee');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();

// Admin login route
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validate input
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }

        // Check admin credentials from environment variables
        const adminUsername = process.env.ADMIN_USERNAME;
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (username !== adminUsername || password !== adminPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid admin credentials'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                username: adminUsername, 
                role: 'admin' 
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        res.status(200).json({
            success: true,
            message: 'Admin login successful',
            token,
            admin: {
                username: adminUsername,
                role: 'admin'
            }
        });

    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login'
        });
    }
});

// Get all employees (Protected route)
router.get('/employees', adminAuth, async (req, res) => {
    try {
        const { status } = req.query;
        
        // Build filter object
        let filter = {};
        if (status !== undefined) {
            filter.status = status === 'true'; // Convert string to boolean
        }
        
        const employees = await Employee.find(filter).select('-__v');
        
        res.status(200).json({
            success: true,
            message: 'Employees retrieved successfully',
            count: employees.length,
            filter: status !== undefined ? { status: status === 'true' } : 'all',
            data: employees
        });

    } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching employees'
        });
    }
});

// Get single employee by ID (Protected route)
router.get('/employees/:id', adminAuth, async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id).select('-__v');
        
        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Employee retrieved successfully',
            data: employee
        });

    } catch (error) {
        console.error('Error fetching employee:', error);
        
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid employee ID format'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error fetching employee'
        });
    }
});

// Create new employee (Protected route)
router.post('/employees', adminAuth, async (req, res) => {
    try {
        const { name, employeeId, phoneNo, status, onamBata } = req.body;

        // Validate required fields
        if (!name || !employeeId) {
            return res.status(400).json({
                success: false,
                message: 'Name and employeeId are required fields'
            });
        }

        // Check if employee with same employeeId already exists
        const existingEmployee = await Employee.findOne({ employeeId });
        if (existingEmployee) {
            return res.status(409).json({
                success: false,
                message: 'Employee with this ID already exists'
            });
        }

        // Create new employee
        const newEmployee = new Employee({
            name,
            employeeId,
            phoneNo,
            status: status !== undefined ? status : true, // Default to active if not provided
            onamBata: onamBata || 0
        });

        const savedEmployee = await newEmployee.save();

        res.status(201).json({
            success: true,
            message: 'Employee created successfully',
            data: savedEmployee
        });

    } catch (error) {
        console.error('Error creating employee:', error);
        
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'Employee with this ID already exists'
            });
        }
        
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: Object.values(error.errors).map(err => err.message)
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error creating employee'
        });
    }
});

// Update employee (Protected route)
router.put('/employees/:id', adminAuth, async (req, res) => {
    try {
        const { name, employeeId, phoneNo, status, onamBata } = req.body;

        // Check if employee exists
        const employee = await Employee.findById(req.params.id);
        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        // If employeeId is being updated, check for duplicates
        if (employeeId && employeeId !== employee.employeeId) {
            const existingEmployee = await Employee.findOne({ employeeId });
            if (existingEmployee) {
                return res.status(409).json({
                    success: false,
                    message: 'Employee with this ID already exists'
                });
            }
        }

        // Update employee
        const updatedEmployee = await Employee.findByIdAndUpdate(
            req.params.id,
            { name, employeeId, phoneNo, status, onamBata },
            { 
                new: true, 
                runValidators: true,
                select: '-__v'
            }
        );

        res.status(200).json({
            success: true,
            message: 'Employee updated successfully',
            data: updatedEmployee
        });

    } catch (error) {
        console.error('Error updating employee:', error);
        
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid employee ID format'
            });
        }

        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'Employee with this ID already exists'
            });
        }

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: Object.values(error.errors).map(err => err.message)
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error updating employee'
        });
    }
});

// Delete employee (Protected route)
router.delete('/employees/:id', adminAuth, async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id);
        
        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        await Employee.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Employee deleted successfully',
            data: {
                deletedEmployee: {
                    id: employee._id,
                    name: employee.name,
                    employeeId: employee.employeeId,
                    status: employee.status
                }
            }
        });

    } catch (error) {
        console.error('Error deleting employee:', error);
        
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid employee ID format'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error deleting employee'
        });
    }
});

module.exports = router;