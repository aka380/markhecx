import {spawnSync} from "node:child_process";
for(const phase of ["phase1","phase2","phase3","phase3-render","phase4","phase5","phase5-render"]){const result=spawnSync(process.execPath,[`scripts/test-${phase}.mjs`],{stdio:"inherit"});if(result.status)process.exit(result.status);}
