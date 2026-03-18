const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const userRoutes = require('./routes/userRoutes');
const staffRoutes = require('./routes/staffRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const workshopRoutes = require('./routes/workshopRoutes');
const settingRoutes = require('./routes/settingRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');

const app = express();

// Enable CORS - MUST be before routes
app.use(cors());

// Stripe Webhook route must be BEFORE express.json()
app.use('/api/stripe', require('./routes/stripeRoutes'));

// Body parser
app.use(express.json());

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount routers
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/workshops', workshopRoutes);
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/documents', require('./routes/documentRoutes'));
app.use('/api/pcp-reports', require('./routes/pcpReportRoutes'));
app.use('/api/progress-notes', require('./routes/progressNoteRoutes'));
app.use('/api/settings', settingRoutes);
app.use('/api/superadmin', superAdminRoutes);
app.use('/api/plans', require('./routes/planRoutes'));

// Basic route
app.get('/', (req, res) => {
    res.send('RIDSS PROGRAM CRM API is running...');
});

// Error Handling Middleware (Basic)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: err.message || 'Server Error'
    });
});

module.exports = app;
