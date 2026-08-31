const Student = require("../models/studentModel");
const mongoose = require("mongoose");
const studentService = require("../services/studentService");
const studentDto = require("../dtos/studentDto");

// GET ALL STUDENTS

const getStudents = async (req, res) => {

    const { name, course, search, sort, page, limit } = req.query;
    const pageNumber = Number(page) || 1;
    const limitNumber = Number(limit) || 10;

    const skip = (pageNumber - 1) * limitNumber;

    const filter = {};

    // If:
// ?page=2&limit=2
// then:
// pageNumber = 2
// limitNumber = 2
// skip = 2
// So MongoDB skips the first 2 students and gives us the next 2.
// The formula is:
// skip = (page - 1) × limit


    if (name) {
        filter.name = name;
    }

    if (course) {
        console.log("COURSE:", course, "VALID:", mongoose.Types.ObjectId.isValid(course));

        if (!mongoose.Types.ObjectId.isValid(course)) {
            return res.status(400).json({
                success: false,
                message: "Invalid course ID"
            });
        }
    
        filter.course = course;
    }

    if (search) {
        filter.name = { $regex: search, $options: "i" };
    }

    // const students = await Student.find(filter)
    // .populate("course")
    // .sort(sort)
    // .skip(skip)
    // .limit(limitNumber);
    const students = await studentService.getStudents(
        filter,
        sort,
        skip,
        limitNumber
    );

    // res.status(200).json({
    //     message: "Students fetched successfully",
    //     students
    // });
    // res.status(200).json({
    //     message: "Students fetched successfully",
    //     students: students.map(studentDto)
    // });
    res.status(200).json({
        success: true,
        message: "Students fetched successfully",
        data: students.map(studentDto)
    });
//     We're changing:
// students: [...]
// to:
// data: [...]
// and adding:
// success: true
// This gives the client a predictable structure:
// success → did the operation succeed?
// message → human-readable explanation
// data    → actual result









//     Why .map(studentDto)?
// If MongoDB gives us:
// Student 1
// Student 2
// Student 3
// .map() runs studentDto() on each student:
// Student 1 → studentDto → { id, name }
// Student 2 → studentDto → { id, name }
// Student 3 → studentDto → { id, name }
};


// GET ONE STUDENT

const getStudentById = async (req, res) => {

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
            message: "Invalid student ID"
        });
    }

    const student = await Student
        .findById(req.params.id)
        .populate("course");

    if (!student) {
        return res.status(404).json({
            message: "Student not found"
        });
    }

    // res.status(200).json({
    //     message: "Student fetched successfully",
    //     student
    // });
    res.status(200).json({
        success: true,
        message: "Student fetched successfully",
        data: studentDto(student)
    });
};
// flow becomes 
// MongoDB student
// ↓
// DTO
//       ↓
// data: { id, name }

// Invalid ID
// GET /api/students/hello
// → 400
// {
//     "message": "Invalid student ID"
// }
// Valid ID but doesn't exist
// GET /api/students/68abc123...
// but no student has that ID.
// → 404
// {
//     "message": "Student not found"
// }

// CREATE STUDENT

const createStudent = async (req, res) => {

    const { name, course } = req.body;

    if (
        typeof name !== "string" ||
        name.trim() === "" ||
        !course
    ) {
        return res.status(400).json({
            success: false,
            message: "Name and course are required"
        });
    }

    if (!mongoose.Types.ObjectId.isValid(course)) {
        return res.status(400).json({
            success: false,
            message: "Invalid course ID"
        });
    }


    const student = await Student.create({
        name,
        course
    });

    res.status(201).json({
        message: "Student created successfully",
        student
    });
};


// UPDATE STUDENT

const updateStudent = async (req, res, next) => {

    try {

        const student = await Student.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!student) {
            return res.status(404).json({
                message: "Student not found"
            });
        }

        res.status(200).json({
            message: "Student updated successfully",
            student
        });

    } catch (error) {

        next(error);

    }

};


// DELETE STUDENT

const deleteStudent = async (req, res) => {

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
            message: "Invalid student ID"
        });
    }

    const student = await Student.findByIdAndDelete(
        req.params.id
    );

    if (!student) {
        return res.status(404).json({
            message: "Student not found"
        });
    }

    res.status(200).json({
        message: "Student deleted successfully"
    });
};

module.exports = {
    getStudents,
    getStudentById,
    createStudent,
    updateStudent,
    deleteStudent
};