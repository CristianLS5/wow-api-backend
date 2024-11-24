import mongoose from "mongoose";

const characterTransmogsSchema = new mongoose.Schema(
  {
    realmSlug: {
      type: String,
      required: true,
    },
    characterName: {
      type: String,
      required: true,
    },
    transmogs: {
      appearance_sets: [
        {
          id: Number,
          name: String,
        },
      ],
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    // Add this to remove _id from subdocuments
    id: false,
  }
);

// Create compound index for efficient querying
characterTransmogsSchema.index({ realmSlug: 1, characterName: 1 });

const CharacterTransmogs = mongoose.model(
  "CharacterTransmogs",
  characterTransmogsSchema
);

export default CharacterTransmogs;
