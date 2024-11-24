import mongoose from "mongoose";

const transmogSchema = new mongoose.Schema({
  setId: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  appearances: [
    {
      id: Number,
      slot: {
        type: { type: String },
        name: String,
      },
      item: {
        id: Number,
        name: String,
      },
      icon: String,
    },
  ],
  lastUpdated: { type: Date, default: Date.now },
});

export default mongoose.model("TransmogSet", transmogSchema);