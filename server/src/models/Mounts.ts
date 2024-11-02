import mongoose from "mongoose";

const MountsSchema = new mongoose.Schema(
  {
    mountId: { type: Number, required: true, unique: true },
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    spellId: { type: Number, default: null },
    itemId: { type: Number, default: null },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("Mount", MountsSchema);
