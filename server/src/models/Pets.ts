import mongoose from "mongoose";

const PetSchema = new mongoose.Schema(
  {
    petId: { type: Number, required: true, unique: true },
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Add indexes for better performance
PetSchema.index({ petId: 1 });
PetSchema.index({ lastUpdated: 1 });

export default mongoose.model("Pet", PetSchema);
