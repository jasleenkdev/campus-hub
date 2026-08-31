const Course = require("../models/courseModel");

const getCourses = async (req, res) => {

    const courses = await Course.find();

    res.json(courses);
};

const createCourse = async (req, res) => {

    const course = await Course.create({
        name: req.body.name,
        duration: req.body.duration
    });

    res.status(201).json(course);
};

module.exports = {
    getCourses,
    createCourse
};