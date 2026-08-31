const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
    registerForEvent,
    getMyRegistrations
} = require("../controllers/registrationController");

router.get("/me", authMiddleware, getMyRegistrations);

router.post("/", authMiddleware, registerForEvent);

module.exports = router;

// GET  /api/registrations/me → getMyRegistrations()  (own rows only)
// POST /api/registrations     → registerForEvent()
//
// both behind authMiddleware (Bearer token required)
