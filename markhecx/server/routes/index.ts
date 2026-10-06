import { Router } from "express";
import { health } from "../controllers/health";
export const api = Router();
api.get("/health", health);

import { authRoutes } from "./auth";
api.use("/auth", authRoutes);

import { creatorRoutes } from "./creators";
api.use(creatorRoutes);

import { marketRoutes } from "./marketplace";
api.use(marketRoutes);

import { memoryRoutes } from "./memory";
api.use(memoryRoutes);

import { hecxRoutes } from "./hecx";
api.use("/hecx", hecxRoutes);

import { communicationRoutes } from "./communication";
api.use(communicationRoutes);
