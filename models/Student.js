const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
    {
        studentId: {
            type: String,
            unique: true,
            required: true,
        },
        name: {
            type: String,
            required: [true, 'Please add a name'],
        },
        phone: {
            type: String,
            required: [true, 'Please add a phone number'],
        },
        email: {
            type: String,
            required: [true, 'Please add an email'],
            unique: true,
            match: [
                /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
                'Please add a valid email',
            ],
        },
        points: {
            type: Number,
            default: 0,
        },
        totalPoints: {
            type: Number,
            default: 250,
        },
        status: {
            type: String,
            enum: ['Active', 'Completed', 'Secondary Completion', 'Dropped'],
            default: 'Active',
        },
        assignedStaff: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        notes: [
            {
                text: { type: String, required: true },
                date: { type: String, required: true },
            }
        ],
        attendance: [
            {
                workshopName: { type: String, required: true },
                pointsEarned: { type: Number, required: true },
                date: { type: String, required: true },
            }
        ],
        documents: [
            {
                name: { type: String, required: true },
                url: { type: String, required: true },
                size: { type: String },
                uploadDate: { type: String, required: true },
                publicId: { type: String } // Needed to delete from Cloudinary later
            }
        ],
        pcpReports: [
            {
                dateOfService: { type: String, required: true },
                serviceDescription: { type: String },
                faceToFace: { type: String, default: 'Face-to-Face' },
                purpose: { type: String },
                intervention: { type: String },
                effectiveness: { type: String },
                staffNotes: { type: String },
                staffSignature: { type: String, required: true },
                status: { type: String, enum: ['Draft', 'Completed'], default: 'Completed' },
                createdAt: { type: Date, default: Date.now }
            }
        ]
    },
    {
        timestamps: true,
    }
);

// Pre-save hook to generate Student ID
studentSchema.pre('validate', async function () {
    if (this.isNew && !this.studentId) {
        // Find highest existing Student ID
        const lastStudent = await this.constructor.findOne({}, {}, { sort: { 'createdAt': -1 } });

        let newIdValue = 1; // Starting ID
        if (lastStudent && lastStudent.studentId) {
            // Extract the numerical part if it exists
            const match = lastStudent.studentId.match(/\d+$/);
            if (match) {
                newIdValue = parseInt(match[0], 10) + 1;
            }
        }
        this.studentId = `STU-${newIdValue.toString().padStart(3, '0')}`;
    }
});

// Pre-save hook to update status based on points (skipped if manually set to 'Dropped')
studentSchema.pre('save', function () {
    if (this.status !== 'Dropped') {
        if (this.points >= 250) {
            this.status = 'Completed';
        } else if (this.status !== 'Secondary Completion') {
            this.status = 'Active';
        }
    }
});

module.exports = mongoose.model('Student', studentSchema);
