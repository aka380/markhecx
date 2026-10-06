import {Router} from "express";
import {health} from "../controllers/health";
export const api=Router();
api.get("/health",health);
