const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
//     req → request
    // res → response
    // next → tells Express to continue
//     Request
//    ↓
// Middleware
//    ↓
// next()
//    ↓
// Next middleware/controller
//    ↓
// Response

    const authHeader = req.headers.authorization;
//     This:
    // req.headers.authorization
    // looks for a request header like:
    // Authorization: Bearer eyJhbGciOi...
    // Remember when we generated the JWT?
    // Login
    //   ↓
    // JWT
    //   ↓
    // Client
    // Now the client sends it back:
    // Authorization: Bearer TOKEN

    // console.log("Authorization header:", authHeader);

    // next();
    if (!authHeader) {
        return res.status(401).json({
            message: "Access denied. No token provided."
        });
    }
    const token = authHeader.split(" ")[1];

    try {

        // Verify token
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // Store decoded information in request
        req.user = decoded;

        // Continue to controller
        next();

    } catch (error) {

        return res.status(401).json({
            message: "Invalid or expired token"
        });
    }
};

module.exports = authMiddleware;