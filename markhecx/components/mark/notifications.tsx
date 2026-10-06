"use client";
import { toast } from "sonner";
import { api, dataChanged } from "@/lib/mark/api/client";
import { useAPIResource } from "./api-resource";
import { Action, Button, Card, EmptyState, PageTitle } from "./ui";
type Notification = {id: string; message: string; href: string; createdAt: string; readAt: string | null};
export function NotificationsPage() {
  const {data, error, loading, retry} = useAPIResource<{notifications: Notification[]}>("/notifications");
  return <div className="page-enter"><PageTitle eyebrow="YOUR WORKSPACE" title="Notifications" description="Updates to your applications, invitations, and conversations." />
    {loading && <p role="status">Loading notifications…</p>}
    {error && <div role="alert">{error}<Button onClick={retry}>Retry</Button></div>}
    {data?.notifications.length === 0 && <EmptyState title="You’re all caught up." description="New collaboration updates will appear here." />}
    {data?.notifications.map(n => <Card className="panel section-copy" key={n.id}><p>{n.message}</p><time>{new Date(n.createdAt).toLocaleString()}</time><div className="row"><Action href={n.href} secondary>View update</Action>{!n.readAt && <Button onClick={async () => {try {await api(`/notifications/${encodeURIComponent(n.id)}/read`, {method: "PUT"});dataChanged();} catch(e){toast.error((e as Error).message);}}}>Mark as read</Button>}</div></Card>)}
  </div>;
}
