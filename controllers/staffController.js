const User = require('../models/User');

// @desc    Get all staff
// @route   GET /api/staff
// @access  Private/Admin
const getAllStaff = async (req, res) => {
    try {
        const staff = await User.find({ role: { $in: ['staff', 'admin'] } }).select('-password');
        res.status(200).json({
            success: true,
            count: staff.length,
            data: staff
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Create new staff
// @route   POST /api/staff
// @access  Private/Admin
const createStaff = async (req, res) => {
    const { name, email, password, role } = req.body;

    try {
        let user = await User.findOne({ email });

        if (user) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        user = await User.create({
            name,
            email,
            password,
            role: role || 'staff',
            status: req.body.status || 'Active'
        });

        res.status(201).json({
            success: true,
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                status: user.status
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Update staff
// @route   PUT /api/staff/:id
// @access  Private/Admin
const updateStaff = async (req, res) => {
    try {
        let user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ success: false, message: 'Staff member not found' });
        }

        // Update fields if they exist in request body
        if (req.body.name) user.name = req.body.name;
        if (req.body.email) user.email = req.body.email;
        if (req.body.role) user.role = req.body.role;
        if (req.body.status) user.status = req.body.status;
        if (req.body.password) user.password = req.body.password;

        await user.save();

        const updatedUser = await User.findById(user._id).select('-password');

        res.status(200).json({
            success: true,
            data: updatedUser
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Delete staff
// @route   DELETE /api/staff/:id
// @access  Private/Admin
const deleteStaff = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ success: false, message: 'Staff member not found' });
        }

        await User.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

module.exports = {
    getAllStaff,
    createStaff,
    updateStaff,
    deleteStaff
};
