import mongoose from "mongoose";

const CharacterDungeonsSchema = new mongoose.Schema(
  {
    realmSlug: { type: String, required: true },
    characterName: { type: String, required: true },
    seasons: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      default: {}
    },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

CharacterDungeonsSchema.pre('save', function(next) {
  this.markModified('seasons');
  next();
});

export default mongoose.model("CharacterDungeons", CharacterDungeonsSchema);
