import mongoose from "mongoose";
import dotenv from "dotenv";
import CharacterProfile from "../models/CharacterProfile";
import CharacterEquipment from "../models/CharacterEquipment";

dotenv.config();

const updateSchemas = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log("Connected to MongoDB");

    // Update CharacterProfile schema
    await CharacterProfile.updateMany(
      { "profile.faction": { $type: "string" } },
      { $set: { "profile.faction": { type: "", name: "" } } }
    );
    console.log("Updated CharacterProfile schema");

    // Update CharacterEquipment schema
    await CharacterEquipment.updateMany(
      {},
      { $set: { "equipment.equipped_items.$[].iconUrl": "" } }
    );
    console.log("Updated CharacterEquipment schema");

    console.log("All schemas updated successfully");
  } catch (error) {
    console.error("Error updating schemas:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
};

updateSchemas();
