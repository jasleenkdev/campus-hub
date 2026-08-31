const express = require("express");


const {
    getStudents,
    getStudentById,
    createStudent,
    updateStudent,
    deleteStudent
} = require("../controllers/studentController");
const validateStudent = require("../middleware/studentValidation");
const asyncHandler = require("../middleware/asyncHandler");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");


// GET all students
router.get("/", authMiddleware, asyncHandler(getStudents));

// GET one student
router.get("/:id", authMiddleware, asyncHandler(getStudentById));

router.post(
    "/",
    validateStudent,
    authMiddleware,
    asyncHandler(createStudent)
);

router.put(
    "/:id",
    authMiddleware,
    asyncHandler(updateStudent)
);

router.patch(
    "/:id",
    authMiddleware,
    asyncHandler(updateStudent)
);

router.delete(
    "/:id",
    authMiddleware,
    asyncHandler(deleteStudent)
);

module.exports = router;