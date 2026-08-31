const studentDto = (student) => {
    const course = student.course;

    // Both read paths populate `course` (studentRepository.getStudents and
    // getStudentById), so the full document is already in memory — exposing it
    // costs no extra query. Falls back to the bare id if an unpopulated
    // document is ever passed in, and to null for a dangling reference.
    const coursePayload =
        course && course.name !== undefined
            ? {
                id: course._id,
                name: course.name,
                duration: course.duration
            }
            : course || null;

    return {
        id: student._id,
        name: student.name,
        course: coursePayload
    };
};

module.exports = studentDto;

// MongoDB document (course populated)
//        ↓
//    studentDto
//        ↓
// { id, name, course: { id, name, duration } }
