import User from '../models/User.model.js';
// import BlacklistToken from '../models/BlacklistToken.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';


export const protectRoute = async (req, res, next) => {
    try {
        const token = req.headers.authorization && req.headers.authorization.split(' ')[1];

        if (!token){
            return res.status(401).json({ message: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded) {
            return res.status(401).json({ message: 'Invalid token' });
        }

        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        req.user = user;
        next();
    } catch (error) {
        
    }
}