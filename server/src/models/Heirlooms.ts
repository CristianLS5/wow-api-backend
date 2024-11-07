import mongoose from "mongoose";

const HeirloomSchema = new mongoose.Schema(
  {
    heirloomId: { type: Number, required: true, unique: true },
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Add indexes for better performance
HeirloomSchema.index({ heirloomId: 1 });
HeirloomSchema.index({ lastUpdated: 1 });

export default mongoose.model("Heirloom", HeirloomSchema); 