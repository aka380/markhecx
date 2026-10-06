import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { marketState, marketCommand } from "../services/marketplace";
import { ApiError } from "../middleware/errors";
import { preferences } from "../models/marketplace";
export const marketRoutes = Router();
marketRoutes.get("/marketplace/public", async (_req, res) =>
  res.json(await marketState()),
);
marketRoutes.get("/campaigns", async (_req, res) =>
  res.json({ campaigns: (await marketState()).campaigns }),
);
marketRoutes.get("/campaigns/:id", async (req, res) => {
  const c = (await marketState()).campaigns.find((c) => c.id === req.params.id);
  if (!c) throw new ApiError(404, "not_found", "Campaign not found.");
  res.json({ campaign: c });
});
marketRoutes.get("/brands/:username", async (req, res) => {
  const b = (await marketState()).brands.find(
    (b) => b.username === req.params.username,
  );
  if (!b) throw new ApiError(404, "not_found", "Brand not found.");
  res.json({ brand: b });
});
marketRoutes.get("/marketplace", authenticate, async (_req, res) =>
  res.json(await marketState(res.locals.user)),
);
marketRoutes.post("/marketplace/commands", authenticate, async (req, res) =>
  res.json(await marketCommand(res.locals.user, req.body)),
);
marketRoutes.get("/saved-creators", authenticate, async (_req, res) =>
  res.json({
    ids:
      (await preferences.findOne({ _id: res.locals.user._id }))
        ?.savedCreators || [],
  }),
);
for (const [path, type] of [
  ["/brands", "brand.save"],
  ["/campaigns", "campaign.save"],
  ["/applications", "application.submit"],
  ["/invitations", "invitation.send"],
])
  marketRoutes.post(path, authenticate, async (req, res) =>
    res
      .status(201)
      .json(await marketCommand(res.locals.user, { type, input: req.body })),
  );
marketRoutes.put("/campaigns/:id", authenticate, async (req, res) => {
  if (req.body.id !== req.params.id)
    throw new ApiError(400, "id", "Campaign IDs must match.");
  res.json(
    await marketCommand(res.locals.user, {
      type: "campaign.save",
      input: req.body,
    }),
  );
});
marketRoutes.delete("/campaigns/:id", authenticate, async (req, res) =>
  res.json(
    await marketCommand(res.locals.user, {
      type: "campaign.delete",
      id: req.params.id,
    }),
  ),
);
for (const [path, key] of [
  ["/applications", "applications"],
  ["/invitations", "invitations"],
  ["/saved-campaigns", "savedCampaigns"],
] as const)
  marketRoutes.get(path, authenticate, async (_req, res) =>
    res.json({ [key]: (await marketState(res.locals.user))[key] }),
  );
