import { Router } from "express";
import { z } from "zod";
import { authenticate, requireRole } from "../middleware/auth";
import {
  creatorWorkspace,
  saveCreator,
  listCreators,
  publicCreator,
} from "../services/creators";
import { creatorDocuments } from "../models/creators";
import { ApiError } from "../middleware/errors";
import {
  profileSchema,
  projectSchema,
  portfolioSchema,
} from "../../lib/mark/store";
export const creatorRoutes = Router();
creatorRoutes.get("/creators", async (_req, res) =>
  res.json({ creators: await listCreators() }),
);
creatorRoutes.get("/creators/username/:username", async (req, res) => {
  const doc = await creatorDocuments.findOne({
    "state.publication.profile.username": req.params.username,
    "state.publication.portfolio.visibility": "Public",
  });
  if (!doc) throw new ApiError(404, "not_found", "Creator not found.");
  res.json({ creator: publicCreator(doc), publication: doc.state.publication });
});
creatorRoutes.get("/creators/:id", async (req, res) => {
  const doc = await creatorDocuments.findOne({
    _id: req.params.id,
    "state.publication.portfolio.visibility": "Public",
  });
  if (!doc) throw new ApiError(404, "not_found", "Creator not found.");
  res.json({ creator: publicCreator(doc), publication: doc.state.publication });
});
creatorRoutes.get("/public/portfolios/:username", async (req, res) => {
  const doc = await creatorDocuments.findOne({
    "state.publication.profile.username": req.params.username,
    "state.publication.portfolio.visibility": { $in: ["Public", "Unlisted"] },
  });
  if (!doc) throw new ApiError(404, "not_found", "Portfolio not found.");
  res.json({ publication: doc.state.publication });
});
creatorRoutes.get("/workspace", authenticate, async (_req, res) => {
  res.json(await creatorWorkspace(res.locals.user));
});
creatorRoutes.put(
  "/workspace",
  authenticate,
  requireRole("Creator"),
  async (req, res) => {
    const input = z
      .object({
        state: z.unknown(),
        revision: z.number().int().nonnegative(),
        publicationAction: z.enum(["none", "publish", "unpublish"]).optional(),
      })
      .strict()
      .parse(req.body);
    res.json(
      await saveCreator(
        res.locals.user,
        input.state,
        input.revision,
        input.publicationAction,
      ),
    );
  },
);
creatorRoutes.use(
  ["/profile", "/projects", "/achievements", "/portfolio"],
  authenticate,
  requireRole("Creator"),
);
creatorRoutes.get("/profile", async (_req, res) => {
  const w = await creatorWorkspace(res.locals.user);
  res.json({ profile: w.state.profile, revision: w.revision });
});
creatorRoutes.put("/profile", async (req, res) => {
  const w = await creatorWorkspace(res.locals.user);
  const input = z
    .object({ profile: profileSchema, revision: z.number().int() })
    .strict()
    .parse(req.body);
  res.json(
    await saveCreator(
      res.locals.user,
      { ...w.state, profile: input.profile },
      input.revision,
    ),
  );
});
creatorRoutes.get("/projects", async (_req, res) => {
  const w = await creatorWorkspace(res.locals.user);
  res.json({ projects: w.state.projects, revision: w.revision });
});
creatorRoutes.post("/projects", async (req, res) => {
  const w = await creatorWorkspace(res.locals.user);
  const project = projectSchema.parse(req.body);
  if (w.state.projects.some((p) => p.id === project.id))
    throw new ApiError(409, "duplicate", "Project already exists.");
  res
    .status(201)
    .json(
      await saveCreator(
        res.locals.user,
        { ...w.state, projects: [...w.state.projects, project] },
        w.revision,
      ),
    );
});
creatorRoutes.put("/projects/:id", async (req, res) => {
  const w = await creatorWorkspace(res.locals.user);
  const p = projectSchema.parse(req.body);
  if (
    p.id !== req.params.id ||
    !w.state.projects.some((p) => p.id === req.params.id)
  )
    throw new ApiError(404, "not_found", "Project not found.");
  res.json(
    await saveCreator(
      res.locals.user,
      {
        ...w.state,
        projects: w.state.projects.map((x) => (x.id === p.id ? p : x)),
      },
      w.revision,
    ),
  );
});
creatorRoutes.delete("/projects/:id", async (req, res) => {
  const w = await creatorWorkspace(res.locals.user);
  if (!w.state.projects.some((p) => p.id === req.params.id))
    throw new ApiError(404, "not_found", "Project not found.");
  res.json(
    await saveCreator(
      res.locals.user,
      {
        ...w.state,
        projects: w.state.projects.filter((p) => p.id !== req.params.id),
      },
      w.revision,
    ),
  );
});
creatorRoutes.get("/achievements", async (_req, res) => {
  const w = await creatorWorkspace(res.locals.user);
  res.json({ achievements: w.state.profile.achievements });
});
creatorRoutes.post("/achievements", async (req, res) => {
  const w = await creatorWorkspace(res.locals.user);
  const a = profileSchema.shape.achievements
    .removeDefault()
    .element.parse(req.body);
  if (w.state.profile.achievements.some((x) => x.id === a.id))
    throw new ApiError(409, "duplicate", "Achievement already exists.");
  res.status(201).json(
    await saveCreator(
      res.locals.user,
      {
        ...w.state,
        profile: {
          ...w.state.profile,
          achievements: [...w.state.profile.achievements, a],
        },
      },
      w.revision,
    ),
  );
});
creatorRoutes.put("/achievements/:id", async (req, res) => {
  const w = await creatorWorkspace(res.locals.user);
  const a = profileSchema.shape.achievements
    .removeDefault()
    .element.parse(req.body);
  if (
    a.id !== req.params.id ||
    !w.state.profile.achievements.some((x) => x.id === a.id)
  )
    throw new ApiError(404, "not_found", "Achievement not found.");
  res.json(
    await saveCreator(
      res.locals.user,
      {
        ...w.state,
        profile: {
          ...w.state.profile,
          achievements: w.state.profile.achievements.map((x) =>
            x.id === a.id ? a : x,
          ),
        },
      },
      w.revision,
    ),
  );
});
creatorRoutes.delete("/achievements/:id", async (req, res) => {
  const w = await creatorWorkspace(res.locals.user);
  if (!w.state.profile.achievements.some((x) => x.id === req.params.id))
    throw new ApiError(404, "not_found", "Achievement not found.");
  res.json(
    await saveCreator(
      res.locals.user,
      {
        ...w.state,
        profile: {
          ...w.state.profile,
          achievements: w.state.profile.achievements.filter(
            (x) => x.id !== req.params.id,
          ),
        },
      },
      w.revision,
    ),
  );
});
creatorRoutes.get("/portfolio", async (_req, res) => {
  const w = await creatorWorkspace(res.locals.user);
  res.json({
    portfolio: w.state.portfolio,
    publication: w.state.publication,
    revision: w.revision,
  });
});
creatorRoutes.put("/portfolio", async (req, res) => {
  const w = await creatorWorkspace(res.locals.user);
  const body = z
    .object({
      portfolio: portfolioSchema,
      publish: z.boolean().default(false),
      revision: z.number().int(),
    })
    .strict()
    .parse(req.body);
  res.json(
    await saveCreator(
      res.locals.user,
      {
        ...w.state,
        portfolio: body.portfolio,
        publication: body.publish
          ? {
              profile: w.state.profile,
              projects: w.state.projects,
              portfolio: body.portfolio,
              publishedAt: new Date().toISOString(),
            }
          : w.state.publication,
      },
      body.revision,
    ),
  );
});
