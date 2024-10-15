import mongoose from "mongoose";

const SlotSchema = new mongoose.Schema(
  {
    type: String,
    name: String,
  },
  { _id: false }
);

const EquippedItemSchema = new mongoose.Schema(
  {
    slot: SlotSchema,
    name: { type: String },
    quality: {
      type: { type: String },
      name: String,
    },
    level: {
      value: Number,
      display_string: String,
    },
    item: {
      id: Number,
    },
    media: {
      id: Number,
    },
    iconUrl: { type: String },
    itemLevel: {
      value: Number,
      display_string: String,
    },
  },
  { strict: false }
);

const CharacterEquipmentSchema = new mongoose.Schema(
  {
    realmSlug: { type: String, required: true },
    characterName: { type: String, required: true },
    equipment: {
      equipped_items: [EquippedItemSchema],
    },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("CharacterEquipment", CharacterEquipmentSchema);
