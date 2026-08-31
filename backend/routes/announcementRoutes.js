const express = require("express");

const router = express.Router();

const {
    getAnnouncements,
    createAnnouncement
} = require("../controllers/announcementController");

router.get("/", getAnnouncements);
router.post("/", createAnnouncement);

module.exports = router;

// GET  /api/announcements → getAnnouncements()
// POST /api/announcements → createAnnouncement()