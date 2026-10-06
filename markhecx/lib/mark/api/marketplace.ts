import type { MarketplaceState } from "../marketplace/models";
import { api } from "./client";
export const emptyMarketplace: MarketplaceState = { brands: [], campaigns: [], applications: [], invitations: [], conversations: [], savedCampaigns: [], savedGroups: {}, activity: [] };
type Command = { type: string; id?: string; input?: unknown; status?: string; expected?: unknown; group?: string };
const changed = (a: unknown, b: unknown) => JSON.stringify(a) !== JSON.stringify(b);
/** Translate existing immutable domain operations into explicit authenticated commands. */
export function marketCommands(before: MarketplaceState, after: MarketplaceState): Command[] {
  const commands: Command[] = [];
  for (const brand of after.brands) { const old = before.brands.find(x => x.id === brand.id); if (changed(old, brand)) commands.push({ type: "brand.save", input: brand, expected: old }); }
  for (const campaign of after.campaigns) {
    const old = before.campaigns.find(x => x.id === campaign.id);
    if (!changed(old, campaign)) continue;
    const status = campaign.status;
    const content = { ...campaign, status: old?.status || "Draft" };
    if (!old || changed({ ...old, updatedAt: "" }, { ...content, updatedAt: "" })) commands.push({ type: "campaign.save", id: campaign.id, input: content, expected: old });
    if (status !== (old?.status || "Draft")) commands.push({ type: "campaign.status", id: campaign.id, status });
  }
  for (const old of before.campaigns) if (!after.campaigns.some(x => x.id === old.id)) commands.push({ type: "campaign.delete", id: old.id });
  for (const app of after.applications) { const old = before.applications.find(x => x.id === app.id); if (!old) commands.push({ type: "application.submit", input: app }); else if (old.status !== app.status) commands.push({ type: "application.review", id: app.id, status: app.status }); }
  for (const invite of after.invitations) { const old = before.invitations.find(x => x.id === invite.id); if (!old) commands.push({ type: "invitation.send", input: invite }); else if (old.status !== invite.status) commands.push({ type: "invitation.respond", id: invite.id, status: invite.status }); }
  for (const thread of after.conversations) { const old = before.conversations.find(x => x.id === thread.id); for (const message of thread.messages) if (!old?.messages.some(x => x.id === message.id)) commands.push({ type: "message.send", input: { campaignId: thread.campaignId, creatorId: thread.creatorId, text: message.text } }); }
  for (const id of new Set([...before.savedCampaigns, ...after.savedCampaigns])) if (before.savedCampaigns.includes(id) !== after.savedCampaigns.includes(id)) commands.push({ type: "campaign.saveForCreator", id });
  for (const id of new Set([...Object.keys(before.savedGroups), ...Object.keys(after.savedGroups)])) if (before.savedGroups[id] !== after.savedGroups[id]) commands.push({ type: "creator.organize", id, group: after.savedGroups[id] || "" });
  return commands;
}
export async function persistMarket(before: MarketplaceState, after: MarketplaceState) {
  let result = before;
  for (const command of marketCommands(before, after)) result = await api<MarketplaceState>("/marketplace/commands", { method: "POST", body: command });
  return result;
}
