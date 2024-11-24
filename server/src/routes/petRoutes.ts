import express from "express";
import * as petController from "../controllers/petController";

const router = express.Router();

router.get("/", petController.getPetsIndex);
router.get("/all", petController.getAllPets);
router.get("/:petId", petController.getPetById);

export default router;
