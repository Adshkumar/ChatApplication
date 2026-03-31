import Status from "../models/status.model.js";
import cloudinary from "../cloudinary.js";

export const getStatuses = async (req, res) => {
  try {
    const statuses = await Status.find({})
      .sort({ createdAt: -1 })
      .populate("userId", "fullName profilePic")
      .populate("views", "fullName profilePic");

    res.status(200).json(statuses);
  } catch (error) {
    // console.error("Error in getStatuses:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const viewStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const status = await Status.findById(id);
    if (!status) return res.status(404).json({ message: "Status not found" });

    if (status.userId.toString() === userId.toString()) {
      return res.status(200).json(status);
    }

    if (!status.views.includes(userId)) {
      status.views.push(userId);
      await status.save();

      const io = req.app.get("socketio");
      if (io) {
        const viewerData = { _id: req.user._id, fullName: req.user.fullName, profilePic: req.user.profilePic };
        io.to(status.userId.toString()).emit("status-viewed", { statusId: id, viewedBy: viewerData });
      }
    }

    res.status(200).json(status);
  } catch (error) {
    // console.error("Error in viewStatus:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const createStatus = async (req, res) => {
  try {
    const { text, image, video, backgroundColor } = req.body;
    const userId = req.user._id;

    let imageUrl;
    let videoUrl;

    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    if (video) {
      const uploadResponse = await cloudinary.uploader.upload(video, {
        resource_type: "video",
      });
      videoUrl = uploadResponse.secure_url;
    }

    const newStatus = new Status({
      userId,
      text,
      imageUrl,
      videoUrl,
      backgroundColor: backgroundColor || "#1a1530",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
    });

    await newStatus.save();

    const populatedStatus = await Status.findById(newStatus._id).populate("userId", "fullName profilePic");

    const io = req.app.get("socketio");
    if (io) io.emit("new-status", populatedStatus);

    res.status(201).json(populatedStatus);
  } catch (error) {
    // console.error("Error in createStatus:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const deleteStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const status = await Status.findById(id);

    if (!status) {
      return res.status(404).json({ message: "Status not found" });
    }

    if (status.userId.toString() !== userId.toString()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    await Status.findByIdAndDelete(id);

    const io = req.app.get("socketio");
    if (io) io.emit("status-deleted", id);

    res.status(200).json({ message: "Status deleted successfully" });
  } catch (error) {
    // console.error("Error in deleteStatus:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
