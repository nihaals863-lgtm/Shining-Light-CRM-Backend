const mongoose = require('mongoose');

const workshopSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Please add a workshop name'],
            unique: true,
        },
        description: {
            type: String,
        },
        pointsReward: {
            type: Number,
            default: 1,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Organization',
            required: true,
        }
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('Workshop', workshopSchema);
