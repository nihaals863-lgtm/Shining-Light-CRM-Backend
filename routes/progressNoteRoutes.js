const express = require('express');
const router = express.Router();
const { createNote, getNotes, updateNote, deleteNote } = require('../controllers/progressNoteController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.use(protect);

router.route('/')
    .get(getNotes)
    .post(upload.single('attachment'), createNote);

router.route('/:id')
    .put(upload.single('attachment'), updateNote)
    .delete(deleteNote);

module.exports = router;
