import mongoose from "mongoose";

const CreatureMediaSchema = new mongoose.Schema(
  {
    creatureDisplayId: { type: Number, required: true, unique: true },
    assets: [
      {
        key: String,
        value: String,
      }
    ],
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("CreatureMedia", CreatureMediaSchema);
