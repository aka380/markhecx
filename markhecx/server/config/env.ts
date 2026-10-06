import {z} from "zod";
const schema=z.object({NODE_ENV:z.enum(["development","test","production"]).default("development"),API_HOST:z.string().default("127.0.0.1"),API_PORT:z.coerce.number().int().min(1).max(65535).default(4000),MONGODB_URI:z.string().default("mongodb://127.0.0.1:27018/?replicaSet=markhecx"),MONGODB_DATABASE:z.string().regex(/^[a-zA-Z0-9_-]+$/).default("markhecx"),WEB_ORIGINS:z.string().default("http://127.0.0.1:3001,http://127.0.0.1:3000"),SESSION_DAYS:z.coerce.number().int().min(1).max(30).default(7),HECX_PROVIDER:z.enum(["mock","gemini"]).default("mock"),GEMINI_API_KEY:z.string().optional(),GEMINI_MODEL:z.string().optional()});
export const config=schema.parse(process.env);
export const origins=config.WEB_ORIGINS.split(",").map(x=>new URL(x.trim()).origin);
if(config.NODE_ENV==="production"&&origins.some(o=>!o.startsWith("https://")))throw Error("Production web origins must use HTTPS.");
