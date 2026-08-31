const express = require("express");

const {
    getCourses,
    createCourse
} = require("../controllers/courseController");

const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

router.get(
    "/",
    asyncHandler(getCourses)
);

router.post(
    "/",
    asyncHandler(createCourse)
);

module.exports = router;