// const Student = require("../models/studentModel");

// const getStudents = async (filter, sort, skip, limit) => {

//     const students = await Student.find(filter)
//         .populate("course")
//         .sort(sort)
//         .skip(skip)
//         .limit(limit);

//     return students;
// };

// The service returns the students instead of sending an HTTP response.


const studentRepository = require("../repositories/studentRepository");

const getStudents = async (filter, sort, skip, limit) => {

    const students = await studentRepository.getStudents(
        filter,
        sort,
        skip,
        limit
    );

    return students;
};

module.exports = {
    getStudents
};
//The service receives the request from the controller and delegates the database operation to the repository.



