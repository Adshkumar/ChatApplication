import cloudinary from '../cloudinary.js';
import Message from '../models/message.model.js';

export const getUsersForSidebar = async (req, res ) => {
    try {
        const loggedInUserID = req.user._id;
        const filteredUsers = await User.find({_id: {$ne:loggedInUserID}}).select("-password")

        res.status(200).json(filteredUsers)
    } catch (error) {
        console.error("Error in getUsersForSidebar: ", error.message);
        res.status(500).json({error: "Internal Server Error"});
    }
}

export const getMessages = async (req, res) => {
    try {
        const {id: userToChatId} = req.params
        const senderID = req.user._id;

        const messages = await Message.find({
            $or:[
                {senderID:senderID, reciverId:userToChatId},
                {senderID:userToChatId, reciverId:senderID}
            ]
        })
        res.status(200).json(messages)
    } catch (error) {
        console.log("Error in get message: ", error.message);
        res.status(500).json({error: "Internal Server Error"})
    }
}

export const sendMessage = async (req, res) => {
    try {
        const {text, image} = req.body;
        const {id: reciverId} = req.params;
        const senderID = req.user._id

        let imageUrl;

        if(image){
            const uploadResponse = await cloudinary.uploader.upload(image)
            imageUrl = uploadResponse.secure_url;
        }

        const newmessage = new Message ({
            senderID,
            reciverId,
            text,
            image: imageUrl,
        });

        await newmessage.save();

        res.status(201).json(newmessage)
    } catch (error) {
        console.log("Error in sending Message: ", error.message);
        res.status(500).json({error: "Internal Server Error"});
    }
}