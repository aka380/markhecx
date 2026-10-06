import {Router} from "express";
import {health} from "../controllers/health";
export const api=Router();
api.get("/health",health);

import {authRoutes} from "./auth";
api.use("/auth",authRoutes);

import {creatorRoutes} from "./creators";
api.use(creatorRoutes);
