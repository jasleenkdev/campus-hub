const mongoose = require("mongoose");
const Registration = require("../models/registrationModel");
const Event = require("../models/eventModel");

const registerForEvent = async (req, res) => {

    // The registering user comes from the verified token, never from the body.
    const user = req.user.userId;
    const { eventId } = req.body;

    if (!eventId) {
        return res.status(400).json({
            message: "eventId is required"
        });
    }

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
        return res.status(400).json({
            message: "Invalid event ID"
        });
    }

    const event = await Event.findById(eventId);

    if (!event) {
        return res.status(404).json({
            message: "Event not found"
        });
    }

    const existingRegistration = await Registration.findOne({
        user,
        event: eventId
    });

    if (existingRegistration) {
        return res.status(409).json({
            message: "You are already registered for this event"
        });
    }

    try {

        const registration = await Registration.create({
            user,
            event: eventId
        });

        res.status(201).json(registration);

    } catch (error) {

        // The unique {user, event} index is the real guard: if two requests race
        // past the check above, the loser lands here and gets the same 409.
        if (error.code === 11000) {
            return res.status(409).json({
                message: "You are already registered for this event"
            });
        }

        throw error;
    }
};

/**
 * Returns the registrations belonging to the authenticated user only.
 * Scoped by req.user.userId, never by anything the client supplies.
 */
const getMyRegistrations = async (req, res) => {

    const registrations = await Registration.find({
        user: req.user.userId
    });

    res.status(200).json(registrations);
};

module.exports = {
    registerForEvent,
    getMyRegistrations
};
