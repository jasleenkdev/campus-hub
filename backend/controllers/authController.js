const bcrypt = require("bcrypt");
const User = require("../models/User");
const jwt = require("jsonwebtoken");


const login = async (req, res) => {

    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({
            message: "Email and password are required"
        });
    }
    const user = await User.findOne({ email });
    if (!user) {
        return res.status(401).json({
            message: "Invalid email or password"
        });
    }
    const isPasswordCorrect = await bcrypt.compare(
        password,
        user.password
    );
    if (!isPasswordCorrect) {
        return res.status(401).json({
            message: "Invalid email or password"
        });
    }
    const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
    );
    res.json({
        message: "Login successful",
        token: token,
        user: {
            id: user._id,
            name: user.name,
            email: user.email
        }
    });

};

const signup = async (req, res) => {

    const { name, email, password } = req.body;

    // Check that all fields were provided
    if (!name || !email || !password) {
        return res.status(400).json({
            message: "Name, email and password are required"
        });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
        return res.status(409).json({
            message: "User already exists"
        });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
//     10
// ↓
// controls how computationally expensive bcrypt hashing is

    // Create user
    const user = await User.create({
        name,
        email,
        password: hashedPassword
    });

    // Send response
    res.status(201).json({
        message: "User created successfully",
        user: {
            id: user._id,
            name: user.name,
            email: user.email
        }
    });
};
const getProfile = async (req, res) => {

    try {

        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        res.json({
            id: user._id,
            name: user.name,
            email: user.email
        });

    } catch (error) {

        res.status(500).json({
            message: "Server error"
        });

    }
};
const logout = (req, res) => {

    res.json({
        message: "Logout successful"
    });

};
module.exports = {
    signup,
    login, 
    getProfile, 
    logout
};