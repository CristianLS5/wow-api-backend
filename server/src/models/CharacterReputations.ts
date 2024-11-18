import mongoose from "mongoose";

const CharacterReputationsSchema = new mongoose.Schema(
  {
    realmSlug: { type: String, required: true },
    characterName: { type: String, required: true },
    reputations: {
      type: Map,
      of: [{
        faction: {
          name: String,
          id: Number
        },
        standing: {
          raw: Number,
          value: Number,
          max: Number,
          tier: Number,
          name: String
        },
        paragon: {
          raw: Number,
          value: Number,
          max: Number
        },
        expansion: String
      }],
      required: true,
    },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model(
  "CharacterReputations",
  CharacterReputationsSchema
);
