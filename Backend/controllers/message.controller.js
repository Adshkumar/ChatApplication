// import cloudinary from '../cloudinary.js';
// import User from "../models/User.model.js";
// import Message from '../models/message.model.js';

// export const getUsersForSidebar = async (req, res ) => {
//     try {
//         const loggedInUserID = req.user._id;
//         const filteredUsers = await User.find({ 
//             _id: { $ne: loggedInUserID } 
//         }).select("-password");

//         res.status(200).json(filteredUsers);
//     } catch (error) {
//         console.error("Error in getUsersForSidebar: ", error.message);
//         res.status(500).json({ error: "Internal Server Error" });
//     }
// }

// export const getMessages = async (req, res) => {
//     try {
//         const { id: userToChatId } = req.params;
//         const senderID = req.user._id;

//         const messages = await Message.find({
//             $or:[
//                 { senderID, reciverId: userToChatId },
//                 { senderID: userToChatId, reciverId: senderID }
//             ]
//         }).sort({ createdAt: 1 });  

//         res.status(200).json(messages);
//     } catch (error) {
//         console.log("Error in get message: ", error.message);
//         res.status(500).json({ error: "Internal Server Error" });
//     }
// }

// export const sendMessage = async (req, res) => {
//     try {
//         const { text, image } = req.body;
//         const { id: reciverId } = req.params;
//         const senderID = req.user._id;

//         let imageUrl;

//         if (image) {
//             const uploadResponse = await cloudinary.uploader.upload(image);
//             imageUrl = uploadResponse.secure_url;
//         }

//         const newMessage = new Message({
//             senderID,
//             reciverId,
//             text,
//             image: imageUrl,
//         });

//         await newMessage.save();

//         res.status(201).json(newMessage);
//     } catch (error) {
//         console.log("Error in sending Message: ", error.message);
//         res.status(500).json({ error: "Internal Server Error" });
//     }
// }
import cloudinary from '../cloudinary.js';
import User from "../models/User.model.js";
import Message from '../models/message.model.js';
import multer from 'multer';

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

export const getUsersForSidebar = async (req, res ) => {
    try {
        const loggedInUserID = req.user._id;
        const filteredUsers = await User.find({ 
            _id: { $ne: loggedInUserID } 
        }).select("-password");

        res.status(200).json(filteredUsers);
    } catch (error) {
        console.error("Error in getUsersForSidebar: ", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export const getMessages = async (req, res) => {
    try {
        const { id: userToChatId } = req.params;
        const senderID = req.user._id;

        const messages = await Message.find({
            $or:[
                { senderID, receiverID: userToChatId },
                { senderID: userToChatId, receiverID: senderID }
            ]
        }).sort({ createdAt: 1 });  

        res.status(200).json(messages);
    } catch (error) {
        console.log("Error in get message: ", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export const sendMessage = async (req, res) => {
    try {
        // console.log("📨 Send message request received");
        // console.log("Request body:", req.body);
        // console.log("Request file:", req.file);
        // console.log("Request params:", req.params);
        // console.log("User:", req.user);

        const { text } = req.body;
        const { id: receiverID } = req.params;
        const senderID = req.user._id;

        console.log("Text:", text);
        console.log("Receiver ID:", receiverID);
        console.log("Sender ID:", senderID);

        let imageUrl;

        // Handle file upload if image exists
        if (req.file) {
            console.log("Processing image upload...");
            try {
                // Convert buffer to base64 for Cloudinary
                const b64 = Buffer.from(req.file.buffer).toString("base64");
                const dataURI = "data:" + req.file.mimetype + ";base64," + b64;
                
                const uploadResponse = await cloudinary.uploader.upload(dataURI, {
                    resource_type: "auto",
                });
                imageUrl = uploadResponse.secure_url;
                console.log("Image uploaded to:", imageUrl);
            } catch (uploadError) {
                console.error("Cloudinary upload error:", uploadError);
                throw uploadError;
            }
        }

        console.log("Creating new message...");
        const newMessage = new Message({
            senderID,
            receiverID,
            text,
            image: imageUrl,
        });

        await newMessage.save();
        console.log("Message saved:", newMessage);

        // Emit socket event for real-time messaging
        const io = req.app.get('socketio');
        if (io) {
            io.to(receiverID).emit('newMessage', newMessage);
            console.log("Socket event emitted to:", receiverID);
        }

        res.status(201).json(newMessage);
    } catch (error) {
        console.log("❌ Error in sending Message:");
        console.log("Error message:", error.message);
        console.log("Error stack:", error.stack);
        console.log("Error name:", error.name);
        res.status(500).json({ error: "Internal Server Error - " + error.message });
    }
}

// Multer middleware for file upload
export const uploadMiddleware = upload.single('image');