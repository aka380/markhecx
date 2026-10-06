import assert from "node:assert/strict";
const frontend=process.env.MARKHECX_FRONTEND_URL||"http://127.0.0.1:3001";
const backend=process.env.MARKHECX_API_URL||"http://127.0.0.1:4000/api/v1";
const routes=["/","/create","/creators","/creators/saved","/creators/ava-chen","/profile","/profile/edit","/profile/avachen?sample=1","/portfolio","/portfolio/builder","/portfolio/preview","/portfolio/mine","/portfolio/ava-chen","/u/avachen?sample=1","/projects","/projects/new","/projects/missing","/projects/missing/edit","/hecx","/hecx?module=Match%20Analyzer","/premium","/about","/samples","/guidelines","/help","/activity","/resources","/settings","/notifications","/messages","/messages?conversation=missing","/brand","/brand/profile","/brand/analytics","/brand/saved","/b/missing","/campaigns","/campaigns/new","/campaigns/saved","/campaigns/missing","/campaigns/missing/edit","/campaigns/missing/matches","/applications","/invitations"];
let home="";
for(const path of routes){const response=await fetch(frontend+path,{signal:AbortSignal.timeout(30000)});assert.equal(response.status,200,path);const html=await response.text();assert.ok(html.includes("MarkHECX"),path);assert.ok(!html.includes("Internal Server Error"),path);if(path==="/")home=html;}
assert.equal((await fetch(frontend+"/unknown-phase6-route")).status,404);
const assets=[...new Set([...home.matchAll(/(?:src|href)="(\/(?:assets|_next\/static)\/[^"?]+\.(?:js|css))"/g)].map(m=>m[1]))];
assert.ok(assets.length>0,"Frontend assets must be linked");
for(const asset of assets)assert.equal((await fetch(frontend+asset)).status,200,asset);
const health=await(await fetch(backend+"/health")).json();assert.equal(health.database,"connected");
assert.equal((await fetch(backend+"/workspace")).status,401);
for(const path of ["/creators","/campaigns","/marketplace/public"]){const r=await fetch(backend+path,{headers:{origin:frontend}});assert.equal(r.status,200,path);assert.equal(r.headers.get("access-control-allow-origin"),frontend);await r.json();}
console.log(JSON.stringify({frontendRoutes:routes.length,unknownRoute:404,assets:assets.length,apiHealth:health.status,unauthenticatedWorkspace:401,publicAPIs:3,browserInteractionTested:false}));
