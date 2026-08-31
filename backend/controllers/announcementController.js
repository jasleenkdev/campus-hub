const Announcement = require("../models/announcementModel");

const getAnnouncements = async (req, res) => {

    const announcements = await Announcement.find();

    res.json(announcements);
};

const createAnnouncement = async (req, res) => {

    const announcement = await Announcement.create({
        title: req.body.title,
        message: req.body.message
    });

    res.status(201).json(announcement);
};

module.exports = {
    getAnnouncements,
    createAnnouncement
};

// GET /api/announcements
//         ↓
// getAnnouncements()
//         ↓
// Announcement.find()
//         ↓
// return all announcements

// POST /api/announcements
//         ↓
// createAnnouncement()
//         ↓
// Announcement.create()
//         ↓
// save to MongoDB