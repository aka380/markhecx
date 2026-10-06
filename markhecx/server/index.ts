import {authIndexes} from "./models/auth";
import {createApp} from "./app";
import {connectDatabase,client} from "./models/database";
import {config} from "./config/env";
await connectDatabase();
await authIndexes();
const server=createApp().listen(config.API_PORT,config.API_HOST,()=>console.log(`MarkHECX API listening on ${config.API_HOST}:${config.API_PORT}`));
for(const signal of ["SIGINT","SIGTERM"]){process.once(signal,()=>server.close(()=>{void client.close().finally(()=>process.exit(0));}));}
