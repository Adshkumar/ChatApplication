import CallLog from "../models/callLog.model.js";

export const getCallLogs = async (req, res) => {
  try {
    const userId = req.user._id;
    const logs = await CallLog.find({
      $or: [
        { caller: userId, showForCaller: true },
        { receiver: userId, showForReceiver: true },
      ],
    })
      .sort({ createdAt: -1 })
      .populate("caller", "fullName profilePic")
      .populate("receiver", "fullName profilePic");

    res.status(200).json(logs);
  } catch (error) {
    // console.error("Error in getCallLogs:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const deleteCallLog = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id.toString();

    const log = await CallLog.findById(id);

    if (!log) {
      return res.status(404).json({ message: "Call log not found" });
    }

    const isCaller = log.caller.toString() === userId;
    const isReceiver = log.receiver.toString() === userId;

    if (!isCaller && !isReceiver) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (isCaller) log.showForCaller = false;
    if (isReceiver) log.showForReceiver = false;

    if (!log.showForCaller && !log.showForReceiver) {
      await CallLog.findByIdAndDelete(id);
    } else {
      await log.save();
    }

    res.status(200).json({ message: "Call log deleted from your view" });
  } catch (error) {
    // console.error("Error in deleteCallLog:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const createCallLog = async (data) => {
  try {
    const { caller, receiver, status, type } = data;
    const newCallLog = new CallLog({
      caller,
      receiver,
      status,
      type,
    });
    await newCallLog.save();
    return newCallLog;
  } catch (error) {
    // console.log("Error in createCallLog:", error.message);
  }
};

export const updateCallStatus = async (callId, status, duration = 0) => {
  try {
    await CallLog.findByIdAndUpdate(callId, { status, duration });
  } catch (error) {
    // console.log("Error in updateCallStatus:", error.message);
  }
};
