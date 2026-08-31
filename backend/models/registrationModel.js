const mongoose = require("mongoose");

const registrationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Event",
        required: true
    }
});

// A user may register for a given event only once. Declared before the model is
// compiled so Mongoose builds it on init; this makes the controller's duplicate
// check a real constraint rather than a check-then-insert race.
registrationSchema.index({ user: 1, event: 1 }, { unique: true });

module.exports = mongoose.model("Registration", registrationSchema);