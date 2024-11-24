import mongoose from "mongoose";

const CollectionsMountsSchema = new mongoose.Schema(
  {
    realmSlug: { type: String, required: true },
    characterName: { type: String, required: true },
    mounts: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("CharacterMounts", CollectionsMountsSchema);
