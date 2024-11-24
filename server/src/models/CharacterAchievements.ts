import mongoose from "mongoose";

const CharacterAchievementSchema = new mongoose.Schema(
  {
    characterId: { 
      realm: { type: String, required: true },
      name: { type: String, required: true }
    },
    achievementSummary: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    statistics: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Compound index for realm and character name
CharacterAchievementSchema.index({ "characterId.realm": 1, "characterId.name": 1 });
CharacterAchievementSchema.index({ lastUpdated: 1 });

export default mongoose.model("CharacterAchievement", CharacterAchievementSchema); 