const Event = require("../models/eventModel");

const getEvents = async (req, res) => {

    const events = await Event.find();

    res.json(events);
};

const createEvent = async (req, res) => {

    const event = await Event.create({
        title: req.body.title,
        description: req.body.description,
        date: req.body.date,
        location: req.body.location
    });

    res.status(201).json(event);
};

module.exports = {
    getEvents,
    createEvent
};