const mongoose = require("mongoose");
const tls = require("tls");

const connectDB = async () => {
    try {

        const secureContext = tls.createSecureContext({
            minVersion: "TLSv1.2",
            maxVersion: "TLSv1.2"
        });

        await mongoose.connect(process.env.MONGO_URI, {
            secureContext
        });

        console.log("MongoDB connected successfully");
        const Student = require("../models/studentModel");

        const indexes = await Student.collection.getIndexes();

        console.log("Student indexes:", indexes);

    } catch (error) {

        console.error(
            "MongoDB connection failed:",
            error.message
        );

        process.exit(1);
    }
};

module.exports = connectDB;