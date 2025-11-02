import User from "../models/User.model.js";
import BlacklistToken from '../models/BlacklistToken.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cloudinary from "../cloudinary.js";

// Register Controller
export const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            username,
            email,
            password: hashedPassword
        });

        const savedUser = await newUser.save();

        // Generate JWT token
        const token = jwt.sign(
            { id: savedUser._id },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        // Send response
        res.status(201).json({
            message: 'User registered successfully',
            user: {
                _id: savedUser._id,
                username: savedUser.username,
                email: savedUser.email,
            },
            token
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Login Controller
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: 'User does not exist' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.status(200).json({
            message: 'Login successful',
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
            },
            token,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Logout Controller
export const logoutUser = async (req, res) => {
    try {
        const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(400).json({ message: 'No token provided' });
        }

        await BlacklistToken.create({ token });

        res.clearCookie('token');

        res.status(200).json({ message: 'Logout successful' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};



export const updateProfile = async (req, res) => {
    try {
        const {profilePic} = req.body;
        const userId = req.user._id;

        if (!profilePic) {
            return res.status(400).json({ message: 'Profile picture is required' });
        }

     const uploadResponse = await cloudinary.uploader.upload(profilePic);
     const updatedUser = await User.findByIdAndUpdate(userId, { Profilpic: uploadResponse.secure_url }, { new: true }).select('-password');

     res.status(200).json({
        message: 'Profile picture updated successfully',
        user: updatedUser
     });     
    } catch (error) {
        console.log("error in updating profile picture:", error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const checkAuth = async (req, res) => {
    try {
        res.status(200).json({ message: "You are authorized", user: req.user });        
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
}; 