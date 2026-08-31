const Student = require("../models/studentModel");

const getStudents = async (filter, sort, skip, limit) => {

    const students = await Student.find(filter)
        .populate("course")
        .sort(sort)
        .skip(skip)
        .limit(limit);

    return students;
};

module.exports = {
    getStudents
};