import mongoose from "mongoose";

const BlacklistTokenSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true,
        unique: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: '7d' 
    }
});

const BlacklistToken = mongoose.model("BlacklistToken", BlacklistTokenSchema);
export default BlacklistToken;