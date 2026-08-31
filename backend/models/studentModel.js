const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },

    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: true
    }
});

const Student = mongoose.model("Student", studentSchema);
studentSchema.index({ course: 1 });
studentSchema.index({ name: 1 });

module.exports = Student;