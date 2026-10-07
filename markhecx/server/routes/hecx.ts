import { Router } from "express";
import { z } from "zod";
import { rateLimit } from "express-rate-limit";
import { authenticate } from "../middleware/auth";
import { ApiError } from "../middleware/errors";
import { hecxBackend } from "../services/hecx";
import {
  hecxModules,
  HecxError,
  errorMessage,
} from "../../lib/mark/hecx/contracts";
import { campaignSchema } from "../../lib/mark/marketplace/models";
import { campaignHECXActions } from "../../lib/mark/hecx/campaign";
export const hecxRoutes = Router();
hecxRoutes.use(
  authenticate,
  rateLimit({
    windowMs: 60000,
    limit: 30,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      error: {
        code: "rate_limit",
        message: "HECX is busy. Try again shortly.",
      },
    },
  }),
);
const small = z.string().max(2000);
const options = z
  .object({
    module: z.enum(hecxModules),
    message: small.optional(),
    projectId: small.optional(),
    creatorId: small.optional(),
    query: z.string().max(200).optional(),
    goal: z.string().max(1000).optional(),
    history: z
      .array(
        z.object({
          role: z.enum(["user", "assistant"]),
          text: small,
          module: z.enum(hecxModules),
        }),
      )
      .max(12)
      .optional(),
    campaign: z
      .object({
        name: small,
        requiredSkills: z.array(small).max(40),
        identity: small.optional(),
        audience: small.optional(),
        budget: z.number().nonnegative().optional(),
        availability: small.optional(),
      })
      .optional(),
    workload: z
      .object({
        availableHours: z.number().finite().nonnegative().max(168),
        commitments: z
          .array(
            z.object({
              title: small,
              deadline: z.string().max(20),
              hours: z.number().finite().nonnegative().max(10000),
            }),
          )
          .max(8),
      })
      .optional(),
  })
  .strict();
hecxRoutes.post("/analyze", async (req, res) => {
  try {
    res.json(
      await hecxBackend.analyze(res.locals.user, options.parse(req.body)),
    );
  } catch (e) {
    if (e instanceof HecxError)
      throw new ApiError(
        e.code === "timeout" ? 504 : e.code === "rate_limit" ? 429 : 503,
        e.code,
        errorMessage(e),
      );
    throw e;
  }
});
hecxRoutes.post("/field", async (req, res) => {
  const body = z
    .object({
      action: z.enum([
        "Analyze Profile",
        "Improve Bio",
        "Suggest Creator Identity",
        "Suggest Skills",
        "Improve Portfolio",
        "Improve Section",
        "Generate Structure",
        "Improve Description",
        "Suggest Tags",
        "Improve Technical Explanation",
        "Summarize Project",
      ]),
      source: z.string().max(12000),
    })
    .strict()
    .parse(req.body);
  res.json(await hecxBackend.field(body.action, body.source));
});
hecxRoutes.post("/campaign", async (req, res) => {
  const body = z
    .object({ campaign: campaignSchema, action: z.enum(campaignHECXActions) })
    .strict()
    .parse(req.body);
  res.json(
    await hecxBackend.campaign(res.locals.user, body.campaign, body.action),
  );
});
hecxRoutes.get("/matches/:id", async (req, res) =>
  res.json({
    matches: await hecxBackend.matches(res.locals.user, req.params.id),
  }),
);

hecxRoutes.get("/matches", async (_req, res) =>
  res.json({ matches: await hecxBackend.allMatches(res.locals.user) }),
);

hecxRoutes.post("/brief", async (req, res) => {
  const body = z
    .object({ prompt: z.string().trim().min(5).max(2000) })
    .strict()
    .parse(req.body);
  res.json(await hecxBackend.brief(res.locals.user, body.prompt));
});
hecxRoutes.post("/match-explanation", async (req, res) => {
  const body = z
    .object({
      campaignId: z.string().min(1).max(100),
      creatorId: z.string().min(1).max(100),
    })
    .strict()
    .parse(req.body);
  res.json(
    await hecxBackend.explainMatch(
      res.locals.user,
      body.campaignId,
      body.creatorId,
    ),
  );
});
hecxRoutes.post("/compare-creators", async (req, res) => {
  const body = z
    .object({
      campaignId: z.string().min(1).max(100),
      creatorIds: z.array(z.string().min(1).max(100)).min(2).max(4),
    })
    .strict()
    .refine((value) => new Set(value.creatorIds).size === value.creatorIds.length)
    .parse(req.body);
  try {
    res.json(
      await hecxBackend.compareCreators(
        res.locals.user,
        body.campaignId,
        body.creatorIds,
      ),
    );
  } catch (e) {
    if (e instanceof HecxError)
      throw new ApiError(
        e.code === "timeout" ? 504 : e.code === "rate_limit" ? 429 : 503,
        e.code,
        errorMessage(e),
      );
    throw e;
  }
});
