import mongoose from "mongoose";

const CharacterProfileSchema = new mongoose.Schema(
  {
    realmSlug: { type: String, required: true },
    characterName: { type: String, required: true },
    profile: {
      name: { type: String, required: true },
      gender: { type: String },
      faction: { type: String },
      race: { type: String },
      character_class: {
        key: { href: String },
        name: String,
        id: Number,
      },
      active_spec: {
        key: { href: String },
        name: String,
        id: Number,
      },
      realm: {
        key: { href: String },
        name: String,
        id: Number,
        slug: String,
      },
      guild: {
        name: { type: String },
        realm: {
          key: { href: String },
          name: String,
          id: Number,
          slug: String,
        },
      },
      level: { type: Number },
      experience: { type: Number },
      achievement_points: { type: Number },
      last_login_timestamp: { type: Number },
      average_item_level: { type: Number },
      equipped_item_level: { type: Number },
    },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("CharacterProfile", CharacterProfileSchema);
