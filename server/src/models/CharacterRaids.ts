import mongoose from "mongoose";

const CharacterRaidsSchema = new mongoose.Schema(
  {
    realmSlug: { type: String, required: true },
    characterName: { type: String, required: true },
    expansions: [
      {
        name: { type: String, required: true },
        instances: [
          {
            instance: {
              name: { type: String, required: true },
              id: { type: Number, required: true },
              media: { type: String },
            },
            modes: [
              {
                difficulty: {
                  type: { type: String, required: true },
                  name: { type: String, required: true },
                },
                status: {
                  type: { type: String, required: true },
                  name: { type: String, required: true },
                },
                progress: {
                  completedCount: { type: Number, required: true },
                  totalCount: { type: Number, required: true },
                },
              },
            ],
          },
        ],
      },
    ],
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("CharacterRaids", CharacterRaidsSchema);
