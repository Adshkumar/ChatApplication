import express from 'express';
import { register, login, logoutUser, updateProfile } from '../controllers/authController.js';
import { protectRoute } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logoutUser);
router.put('/update-profile', protectRoute, updateProfile);

router.get("/check", protectRoute, (req, res) => {
    res.status(200).json({ message: "You are authorized", user: req.user });
});
export default router;
