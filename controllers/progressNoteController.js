const ProgressNote = require('../models/ProgressNote');
const Student = require('../models/Student');
const imagekit = require('../config/imagekit');

// @desc    Create a Progress Note
// @route   POST /api/progress-notes
// @access  Private
const createNote = async (req, res) => {
    try {
        const getField = (name) => {
            const val = req.body[name];
            return Array.isArray(val) ? val[0] : val;
        };

        const studentId = getField('studentId');
        if (!studentId) {
            return res.status(400).json({ success: false, message: 'Student ID is required.' });
        }

        // Verify student belongs to org
        const student = await Student.findOne({ _id: studentId, organizationId: req.user.organizationId });
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found in your organization.' });
        }

        let attachmentUrl = undefined;
        if (req.file) {
            try {
                const uploadResponse = await imagekit.upload({
                    file: req.file.buffer,
                    fileName: req.file.originalname,
                    folder: '/progress-notes'
                });
                attachmentUrl = uploadResponse.url;
            } catch (err) {
                console.error('ImageKit Upload Error:', err);
                return res.status(500).json({ success: false, message: 'File upload failed' });
            }
        }

        const note = await ProgressNote.create({
            studentId,
            programCase: getField('programCase'),
            dateOfSession: getField('dateOfSession'),
            sessionType: getField('sessionType'),
            noteTitle: getField('noteTitle'),
            notes: getField('notes'),
            followUpRequired: getField('followUpRequired') === 'true',
            followUpDate: getField('followUpDate') || undefined,
            attachment: attachmentUrl,
            staffMember: getField('staffMember'),
            createdBy: req.user._id,
            organizationId: req.user.organizationId
        });

        res.status(201).json({ success: true, data: note });
    } catch (error) {
        console.error('CREATE NOTE ERROR:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all Progress Notes (global or per student)
// @route   GET /api/progress-notes
// @access  Private
const getNotes = async (req, res) => {
    try {
        const filter = { organizationId: req.user.organizationId };
        
        if (req.query.studentId) {
            filter.studentId = req.query.studentId;
        }

        if (req.user.role === 'staff') {
            // Option: Staff only see notes they created, or notes for students assigned to them
            // Match the PCP pattern: students assigned to them
            const assignedStudents = await Student.find({ 
                assignedStaff: req.user._id,
                organizationId: req.user.organizationId 
            }).select('_id');
            const assignedIds = assignedStudents.map(s => s._id);
            
            if (req.query.studentId) {
                if (!assignedIds.find(id => id.toString() === req.query.studentId)) {
                    return res.status(403).json({ success: false, message: 'Not authorized for this student' });
                }
            } else {
                filter.studentId = { $in: assignedIds };
            }
        }

        const notes = await ProgressNote.find(filter)
            .populate('studentId', 'name studentId')
            .populate('createdBy', 'name role')
            .sort('-dateOfSession');

        res.status(200).json({ success: true, data: notes });
    } catch (error) {
        console.error('GET NOTES ERROR:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Update Progress Note
// @route   PUT /api/progress-notes/:id
// @access  Private
const updateNote = async (req, res) => {
    try {
        let note = await ProgressNote.findById(req.params.id);
        if (!note) return res.status(404).json({ success: false, message: 'Note not found' });

        if (note.organizationId.toString() !== req.user.organizationId.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const getField = (name) => {
            const val = req.body[name];
            return Array.isArray(val) ? val[0] : val;
        };

        const updateData = {
            programCase: getField('programCase'),
            dateOfSession: getField('dateOfSession'),
            sessionType: getField('sessionType'),
            noteTitle: getField('noteTitle'),
            notes: getField('notes'),
            followUpRequired: getField('followUpRequired') === 'true',
            followUpDate: getField('followUpDate') || undefined,
            staffMember: getField('staffMember')
        };

        if (req.file) {
            try {
                const uploadResponse = await imagekit.upload({
                    file: req.file.buffer,
                    fileName: req.file.originalname,
                    folder: '/progress-notes'
                });
                updateData.attachment = uploadResponse.url;
            } catch (err) {
                console.error('ImageKit Upload Error:', err);
            }
        }

        note = await ProgressNote.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.status(200).json({ success: true, data: note });
    } catch (error) {
        console.error('UPDATE NOTE ERROR:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete Progress Note
// @route   DELETE /api/progress-notes/:id
// @access  Private
const deleteNote = async (req, res) => {
    try {
        const note = await ProgressNote.findById(req.params.id);
        if (!note) return res.status(404).json({ success: false, message: 'Note not found' });

        if (note.organizationId.toString() !== req.user.organizationId.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        // Only Admin or Creator can delete? (Follow existing pattern: Admin only for documents?)
        // Let's allow creator or admin for notes as they are more frequent.
        if (req.user.role !== 'admin' && note.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized to delete' });
        }

        await note.deleteOne();
        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        console.error('DELETE NOTE ERROR:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

module.exports = {
    createNote,
    getNotes,
    updateNote,
    deleteNote
};
