import mongoose from "mongoose";

const CharacterDungeonsSchema = new mongoose.Schema(
  {
    realmSlug: { type: String, required: true },
    characterName: { type: String, required: true },
    seasons: {
      type: Map,
      of: {
        seasonId: Number,
        bestRuns: [
          {
            completedTimestamp: Date,
            duration: Number,
            keystoneLevel: Number,
            dungeon: {
              id: Number,
              name: String,
              media: String,
            },
            isCompleted: Boolean,
            affixes: [
              {
                id: Number,
                name: String,
              },
            ],
            rating: Number,
          },
        ],
        rating: Number,
      },
    },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("CharacterDungeons", CharacterDungeonsSchema);
