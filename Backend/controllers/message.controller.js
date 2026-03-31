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
        
        // 1. Get all users except current
        const users = await User.find({ _id: { $ne: loggedInUserID } }).select("-password");

        // 2. Efficiently fetch last messages for all these users in one go
        const usersWithLastMsg = await Promise.all(users.map(async (user) => {
            const lastMsg = await Message.findOne({
                $or: [
                    { senderID: loggedInUserID, receiverID: user._id },
                    { senderID: user._id, receiverID: loggedInUserID }
                ]
            }).sort({ createdAt: -1 });

            return {
                ...user.toObject(),
                lastMessage: lastMsg ? {
                    text: lastMsg.text,
                    image: lastMsg.image,
                    senderID: lastMsg.senderID,
                    createdAt: lastMsg.createdAt,
                    isDeleted: lastMsg.isDeleted
                } : null
            };
        }));

        res.status(200).json(usersWithLastMsg);
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
            ],
            // Exclude messages hidden for this user
            deletedFor: { $ne: senderID }
        }).sort({ createdAt: 1 });

        res.status(200).json(messages);
    } catch (error) {
        console.log("Error in get message: ", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export const sendMessage = async (req, res) => {
    try {
        const { text } = req.body;
        const { id: receiverID } = req.params;
        const senderID = req.user._id;

        let imageUrl;

        if (req.file) {
            try {
                const b64 = Buffer.from(req.file.buffer).toString("base64");
                const dataURI = "data:" + req.file.mimetype + ";base64," + b64;
                const uploadResponse = await cloudinary.uploader.upload(dataURI, {
                    resource_type: "auto",
                });
                imageUrl = uploadResponse.secure_url;
            } catch (uploadError) {
                console.error("Cloudinary upload error:", uploadError);
                throw uploadError;
            }
        }

        const newMessage = new Message({
            senderID,
            receiverID,
            text,
            image: imageUrl,
        });

        await newMessage.save();

        const io = req.app.get('socketio');
        if (io) {
            const rid = receiverID.toString();
            console.log(`📡 Socket emitting newMessage to room ${rid}`);
            io.to(rid).emit('newMessage', newMessage);
        }

        res.status(201).json(newMessage);
    } catch (error) {
        console.log("❌ Error in sending Message:", error.message);
        res.status(500).json({ error: "Internal Server Error - " + error.message });
    }
}

export const deleteMessage = async (req, res) => {
    try {
        const { id: messageId } = req.params;
        const requesterId = req.user._id;

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ error: "Message not found" });
        }

        const isSender = message.senderID.toString() === requesterId.toString();

        if (isSender) {
            // Sender deletes their own message → mark deleted for EVERYONE (WhatsApp-style)
            message.isDeleted = true;
            message.text = null;
            message.image = null;
            await message.save();

            // Notify both sides via socket
            const io = req.app.get('socketio');
            if (io) {
                const payload = { messageId, isDeleted: true };
                io.to(message.receiverID.toString()).emit('messageDeleted', payload);
                io.to(message.senderID.toString()).emit('messageDeleted', payload);
            }

            return res.status(200).json({ success: true, message, deletedForEveryone: true });
        } else {
            // Someone deleting the other person's message → hide only for themselves (Instagram/WhatsApp "Delete for me")
            if (!message.deletedFor.includes(requesterId)) {
                message.deletedFor.push(requesterId);
                await message.save();
            }

            return res.status(200).json({ success: true, message, deletedForMe: true });
        }
    } catch (error) {
        console.log("❌ Error in deleting Message:", error.message);
        res.status(500).json({ error: "Internal Server Error - " + error.message });
    }
}

// Multer middleware for file upload
export const uploadMiddleware = upload.single('image');

export const markMessagesAsRead = async (req, res) => {
    try {
        const { id: userToReadId } = req.params; // The person whose messages WE just read
        const readerId = req.user._id;

        // Update all unread messages from them to US
        await Message.updateMany(
            { senderID: userToReadId, receiverID: readerId, isRead: false },
            { $set: { isRead: true } }
        );

        // Notify the SENDER that we read their messages
        const io = req.app.get('socketio');
        if (io) {
            io.to(userToReadId.toString()).emit('messagesSeen', { byUserId: readerId });
        }

        res.status(200).json({ message: "Messages marked as read" });
    } catch (error) {
        console.error("Error in markMessagesAsRead:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
}