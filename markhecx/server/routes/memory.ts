import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth";
import { memories } from "../models/memory";
export const memoryRoutes = Router();
memoryRoutes.use("/hecx/memory", authenticate);
const key = z.enum(["goal", "preferredPlatform", "communicationStyle"]);
memoryRoutes.get("/hecx/memory", async (_req, res) =>
  res.json({
    memories: await memories
      .find({ userId: res.locals.user._id })
      .project({ _id: 0, userId: 0 })
      .toArray(),
  }),
);
memoryRoutes.put("/hecx/memory/:key", async (req, res) => {
  const k = key.parse(req.params.key),
    body = z
      .object({ value: z.string().trim().min(1).max(500) })
      .strict()
      .parse(req.body),
    now = new Date();
  await memories.updateOne(
    { userId: res.locals.user._id, key: k },
    {
      $set: { value: body.value, updatedAt: now },
      $setOnInsert: {
        _id: res.locals.user._id + ":" + k,
        userId: res.locals.user._id,
        key: k,
        source: "user",
        createdAt: now,
      },
    },
    { upsert: true },
  );
  res.json({ key: k, value: body.value, source: "user" });
});
memoryRoutes.delete("/hecx/memory/:key", async (req, res) => {
  await memories.deleteOne({
    userId: res.locals.user._id,
    key: key.parse(req.params.key),
  });
  res.sendStatus(204);
});
