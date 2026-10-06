import type {RequestHandler} from "express";
import {db} from "../models/database";
export const health:RequestHandler=async(_req,res)=>{try{await db.command({ping:1});res.json({status:"ok",database:"connected",apiVersion:"v1"});}catch{res.status(503).json({status:"unavailable",database:"disconnected"});}};
