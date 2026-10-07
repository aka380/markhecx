import test from "node:test";
import assert from "node:assert/strict";
import { start } from "./helpers";
import { creatorDocuments, type CreatorDocument } from "../models/creators";
import { emptyState } from "../../lib/mark/store";
import { blankProject, blankPortfolio } from "../../lib/mark/models";
import { creativeSchema } from "../../lib/mark/creative";

test("discovery finds published project capabilities, preserves pagination and excludes private evidence", async () => {
  const app = await start();
  const tag = crypto.randomUUID();
  const docs: CreatorDocument[] = ["a", "b", "private"].map((suffix) => {
    const state = structuredClone(emptyState);
    state.profile.username = `${tag}-${suffix}`;
    state.publication = {
      profile: {...state.profile, name: `${tag} ${suffix}`, identity: "AI Filmmaker",
        skills:[{id:"skill", name:`Editing-${tag}`, category:"Design"}]},
      projects: [
        {...blankProject(), status:"Published", title:"Published reel", creative:creativeSchema.parse({
          tools:[`Runway-${tag}`], models:[`Model-${tag}`], contentTypes:["Video"],
          formats:["Short film"], platforms:["Instagram"], specialization:"AI animation",
        })},
        {...blankProject(), title:`secret-${tag}`, creative:creativeSchema.parse({tools:[`secret-${tag}`]})},
      ],
      portfolio:{...blankPortfolio(), visibility:suffix === "private" ? "Private" : "Public"},
      publishedAt:new Date().toISOString(),
    };
    return {_id:`discovery-${tag}-${suffix}`, revision:0, state, createdAt:new Date(), updatedAt:new Date()};
  });
  docs[1].state.publication!.projects.push({...blankProject(), title:"Second published project", status:"Published"});
  docs[0].state.publication!.profile.bio = docs[1].state.profile.username;
  try {
    await creatorDocuments.insertMany(docs);
    const search = async (params: Record<string,string>) => {
      const response = await fetch(app.base + "/creators/search?" + new URLSearchParams({q:tag,...params}));
      assert.equal(response.status,200);
      return response.json();
    };
    const cases: Record<string, string>[] = [
      {tool:`Runway-${tag}`}, {contentType:"Video"}, {format:"Short film"},
      {platform:"Instagram"}, {specialization:"AI animation"}, {q:`Model-${tag}`},
    ];
    for (const params of cases) {
      const result = await search(params);
      assert.equal(result.total,2,JSON.stringify(params));
      assert.ok(result.creators.every((c: {id:string}) => !c.id.endsWith("private")));
      assert.ok(result.creators[0].creative.tools.includes(`Runway-${tag}`));
    }
    assert.equal((await search({tool:`secret-${tag}`})).total,0);
    assert.equal((await search({q:`secret-${tag}`})).total,0);
    assert.equal((await search({tool:"no-such-tool"})).total,0);
    const first = await search({limit:"1",page:"1"});
    const second = await search({limit:"1",page:"2"});
    assert.equal(first.total,2); assert.equal(first.pages,2);
    assert.equal(first.creators.length,1); assert.notEqual(first.creators[0].id,second.creators[0].id);
    assert.equal((await search({sort:"Most Projects", limit:"1"})).creators[0].id, docs[1]._id);
    assert.equal((await search({q:docs[1].state.profile.username, sort:"Most Relevant", limit:"1"})).creators[0].id, docs[1]._id);
    const facets = await (await fetch(app.base + "/creators/facets")).json();
    assert.ok(facets.skills.includes(`Editing-${tag}`));
    assert.ok(facets.identity.includes("AI Filmmaker"));
  } finally {
    await creatorDocuments.deleteMany({_id:{$in:docs.map(d => d._id)}});
    await app.close();
  }
});
