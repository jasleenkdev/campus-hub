require("dotenv").config();
const errorHandler = require("./middleware/errorMiddleware");
const express = require("express");
const courseRoutes = require("./routes/courseRoutes");
const connectDB = require("./db");
const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");
const eventRoutes = require("./routes/eventRoutes");
const registrationRoutes = require("./routes/registrationRoutes");
const announcementRoutes = require("./routes/announcementRoutes");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const mongoose = require("mongoose");
const app = express();
const PORT = process.env.PORT || 8000;

// Rate limits. The production values are the DEFAULT: the relaxed local values
// apply only when RATE_LIMIT_RELAXED is explicitly set to "true" and NODE_ENV
// is not "production", so deploying without the flag — or with it set by
// mistake — still gets the strict limits.
const relaxRateLimits =
    process.env.RATE_LIMIT_RELAXED === "true" &&
    process.env.NODE_ENV !== "production";

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: relaxRateLimits ? 2000 : 100
});
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: relaxRateLimits ? 200 : 10
});

if (relaxRateLimits) {
    console.warn(
        "RATE_LIMIT_RELAXED is on: rate limits raised for local development. " +
        "Never enable this outside local development."
    );
}

app.use(express.json());
if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is missing");
    process.exit(1);
}
app.use(cors());
app.use(helmet());
app.use(limiter);
app.use(morgan("dev"));

// helmet() adds several security-related HTTP headers to your responses.
// Think of it as:
// Browser request
//       ↓
// Express
//       ↓
// Helmet adds security headers
//       ↓
// Response

const studentRoutes = require("./routes/studentRoutes");


// Home route
app.get("/", (req, res) => {
    res.send("Welcome to CampusHub");
});


// API health check
app.get("/api", (req, res) => {
    res.send("CampusHub API is running");
});


// Student routes
app.use("/api/students", studentRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/registrations", registrationRoutes);
app.use("/api/announcements", announcementRoutes);

// Error handler must be registered AFTER every route, otherwise routes
// mounted below it never reach it and leak Express's default HTML error page.
app.use(errorHandler);

// Connect to MongoDB first
connectDB()
    .then(() => {
        
        // app.listen(process.env.PORT, () => {
        //     console.log(
        //         `CampusHub server is running on port ${process.env.PORT}`
        //     );
        // });
        const server = app.listen(PORT, () => {
            console.log(`CampusHub server is running on port ${PORT}`);
        });
        process.on("SIGINT", async () => {
            console.log("SIGINT received. Shutting down gracefully...");
        
            server.close(async () => {
                await mongoose.connection.close();
        
                console.log("Server and MongoDB connection closed.");
                process.exit(0);
            });
        });

    })
    .catch((error) => {

        console.error(
            "Failed to start server:",
            error.message
        );

    });