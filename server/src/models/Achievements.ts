import mongoose from "mongoose";

const AchievementSchema = new mongoose.Schema(
  {
    achievementId: { type: Number, required: true, unique: true },
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Add indexes for better performance
AchievementSchema.index({ achievementId: 1 });
AchievementSchema.index({ lastUpdated: 1 });

export default mongoose.model("Achievement", AchievementSchema); 