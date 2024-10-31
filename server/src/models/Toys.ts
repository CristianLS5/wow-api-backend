import mongoose from "mongoose";

const ToySchema = new mongoose.Schema(
  {
    toyId: { type: Number, required: true, unique: true },
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Add indexes for better performance
ToySchema.index({ toyId: 1 });
ToySchema.index({ lastUpdated: 1 });

export default mongoose.model("Toy", ToySchema);
