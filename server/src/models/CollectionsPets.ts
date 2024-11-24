import mongoose from "mongoose";

const CollectionsPetsSchema = new mongoose.Schema(
  {
    realmSlug: { type: String, required: true },
    characterName: { type: String, required: true },
    pets: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("CharacterPets", CollectionsPetsSchema);
