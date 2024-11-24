import mongoose from "mongoose";

const DungeonSeasonSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true },
    seasonName: { type: String, required: true },
    startTimestamp: { type: Date, required: true },
    periods: [{ type: Number }],
    isCurrent: { type: Boolean, default: false },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("DungeonSeason", DungeonSeasonSchema);
