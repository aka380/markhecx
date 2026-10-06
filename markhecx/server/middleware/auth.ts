import type {RequestHandler,Request} from "express";
import {sessions,users,User} from "../models/auth";
import {tokenHash} from "../services/auth";
import {ApiError} from "./errors";
export function sessionToken(req:Request){const token=req.headers.cookie?.split(";").map(x=>x.trim()).find(x=>x.startsWith("markhecx_session="))?.slice("markhecx_session=".length);return token&&/^[A-Za-z0-9_-]{43}$/.test(token)?token:undefined;}
export const authenticate:RequestHandler=async(req,res,next)=>{const token=sessionToken(req);const session=token?await sessions.findOne({_id:tokenHash(token),expiresAt:{$gt:new Date()}}):null;const user=session?await users.findOne({_id:session.userId}):null;if(!session||!user)throw new ApiError(401,"unauthorized","Sign in to continue.");if(!["GET","HEAD","OPTIONS"].includes(req.method)&&req.get("X-CSRF-Token")!==session.csrfToken)throw new ApiError(403,"csrf","Refresh your session before trying again.");res.locals.user=user;res.locals.session=session;next();};
export const requireRole=(role:User["role"]):RequestHandler=>(_req,res,next)=>{if(res.locals.user?.role!==role)throw new ApiError(403,"forbidden",`This action requires a ${role} account.`);next();};
