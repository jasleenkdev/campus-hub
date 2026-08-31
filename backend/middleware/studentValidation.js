const validateStudent = (req, res, next) => {

    const { name, course } = req.body;

    if (!name || !course) {
        return res.status(400).json({
            message: "Name and course are required"
        });
    }

    if (typeof name !== "string" || typeof course !== "string") {
        return res.status(400).json({
            message: "Name and course must be strings"
        });
    }

    if (name.trim() === "" || course.trim() === "") {
        return res.status(400).json({
            message: "Name and course cannot be empty"
        });
    }

    next();
};

module.exports = validateStudent;