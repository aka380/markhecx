"use client";
import { useState } from "react";
import { Plus, X, Pencil, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CreatorProfile, Skill } from "@/lib/mark/models";
import { Button, Input, Textarea, Choice, Avatar, Card, Badge } from "../ui";
export function SkillEditor({
  skills,
  onChange,
}: {
  skills: Skill[];
  onChange: (skills: Skill[]) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Other");
  const [proficiency, setProficiency] = useState("Not specified");
  function add() {
    if (!name.trim()) return;
    if (!editingId && skills.length >= 5) {
      toast.error("Keep 3–5 core skills. Remove one to add another.");
      return;
    }
    if (
      skills.some(
        (s) =>
          s.id !== editingId &&
          s.name.toLowerCase() === name.trim().toLowerCase(),
      )
    ) {
      toast.error("This skill is already in your toolkit.");
      return;
    }
    const skill: Skill = {
      id: editingId || crypto.randomUUID(),
      name: name.trim(),
      category,
      ...(proficiency !== "Not specified"
        ? { proficiency: proficiency as Skill["proficiency"] }
        : {}),
    };
    onChange(
      editingId
        ? skills.map((s) => (s.id === editingId ? skill : s))
        : [...skills, skill],
    );
    setEditingId(null);
    setName("");
  }
  return (
    <div className="stack">
      <p className="small-note">Choose 3–5 skills. Proficiency is optional.</p>
      <div className="skill-list">
        {skills.map((s) => (
          <Card key={s.id} className="skill-row">
            <div>
              <strong>{s.name}</strong>
              <span>
                {s.category}
                {s.proficiency ? ` · ${s.proficiency}` : ""}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Edit skill ${s.name}`}
              onClick={() => {
                setEditingId(s.id);
                setName(s.name);
                setCategory(s.category);
                setProficiency(s.proficiency || "Not specified");
              }}
            >
              <Pencil size={15} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Remove skill ${s.name}`}
              onClick={() => {
                onChange(skills.filter((x) => x.id !== s.id));
                if (editingId === s.id) {
                  setEditingId(null);
                  setName("");
                }
              }}
            >
              <X size={15} />
            </Button>
          </Card>
        ))}
      </div>
      <div className="skill-add">
        <label className="field">
          Skill name
          <Input
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            placeholder="A skill you actually use"
          />
        </label>
        <label className="field">
          Category
          <Choice
            label="Skill category"
            value={category}
            onChange={setCategory}
            options={[
              "Design",
              "Development",
              "AI & Data",
              "Writing",
              "Marketing",
              "Other",
            ]}
          />
        </label>
        <label className="field">
          Proficiency <span className="optional">Optional</span>
          <Choice
            label="Skill proficiency"
            value={proficiency}
            onChange={setProficiency}
            options={["Not specified", "Learning", "Practicing", "Advanced"]}
          />
        </label>
        <Button
          type="button"
          className="btn-secondary"
          onClick={add}
          disabled={!name.trim() || (!editingId && skills.length >= 5)}
        >
          <Plus size={16} />
          {editingId ? "Save skill" : "Add skill"}
        </Button>
      </div>
      {editingId && (
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setEditingId(null);
            setName("");
          }}
        >
          Cancel skill edit
        </Button>
      )}
    </div>
  );
}
export function ProfilePhoto({
  profile,
  onChange,
}: {
  profile: CreatorProfile;
  onChange: (avatar: string) => void;
}) {
  return (
    <div className="avatar-editor">
      <Avatar name={profile.name} image={profile.avatar} large />
      <label className="upload-label">
        <Upload size={16} />
        Choose photo
        <input
          aria-label="Profile photo"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            if (
              !["image/png", "image/jpeg", "image/webp"].includes(f.type) ||
              f.size > 700 * 1024
            ) {
              toast.error("Choose a PNG, JPEG, or WebP under 700 KB.");
              return;
            }
            const r = new FileReader();
            r.onerror = () => toast.error("The photo could not be read.");
            r.onload = () => onChange(String(r.result));
            r.readAsDataURL(f);
            e.target.value = "";
          }}
        />
      </label>
      {profile.avatar && (
        <Button type="button" variant="ghost" onClick={() => onChange("")}>
          Remove photo
        </Button>
      )}
    </div>
  );
}
type RecordItem = {
  id: string;
  title: string;
  description?: string;
  organization?: string;
  institution?: string;
  issuer?: string;
  period?: string;
  date?: string;
};
export function RecordEditor({
  kind,
  items,
  onChange,
}: {
  kind: "Experience" | "Education" | "Achievements";
  items: RecordItem[];
  onChange: (items: RecordItem[]) => void;
}) {
  const [editing, setEditing] = useState<RecordItem | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const orgKey =
    kind === "Experience"
      ? "organization"
      : kind === "Education"
        ? "institution"
        : "issuer";
  const timeKey = kind === "Achievements" ? "date" : "period";
  return (
    <div className="stack">
      <div className="row">
        <h3>{kind}</h3>
        <Badge>Optional</Badge>
        <Button
          type="button"
          className="btn-secondary push-right"
          onClick={() => setEditing({ id: crypto.randomUUID(), title: "" })}
        >
          <Plus size={15} />
          Add {kind === "Achievements" ? "achievement" : kind.toLowerCase()}
        </Button>
      </div>
      {items.map((item) => (
        <Card key={item.id} className="record-row">
          <div>
            <h3>{item.title}</h3>
            {item[orgKey] && <p>{item[orgKey]}</p>}
            {item[timeKey] && (
              <span className="small-note">{item[timeKey]}</span>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Edit ${item.title}`}
            onClick={() => setEditing({ ...item })}
          >
            <Pencil size={15} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Remove ${item.title}`}
            onClick={() => setRemoving(item.id)}
          >
            <X size={15} />
          </Button>
        </Card>
      ))}
      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="mark-dialog">
          <DialogTitle>
            {items.some((x) => x.id === editing?.id) ? "Edit" : "Add"}{" "}
            {kind.toLowerCase()}
          </DialogTitle>
          <DialogDescription>
            Only a title is required. Add details you want to share.
          </DialogDescription>
          <div className="form-grid">
            <label className="field">
              Title
              <Input
                maxLength={120}
                value={editing?.title || ""}
                onChange={(e) =>
                  setEditing((x) =>
                    x ? { ...x, title: e.target.value } : null,
                  )
                }
              />
            </label>
            <label className="field">
              {orgKey[0].toUpperCase() + orgKey.slice(1)}{" "}
              <span className="optional">Optional</span>
              <Input
                maxLength={120}
                value={editing?.[orgKey] || ""}
                onChange={(e) =>
                  setEditing((x) =>
                    x ? { ...x, [orgKey]: e.target.value } : null,
                  )
                }
              />
            </label>
            <label className="field">
              {kind === "Achievements" ? "Date" : "Period"}{" "}
              <span className="optional">Optional</span>
              <Input
                maxLength={80}
                value={editing?.[timeKey] || ""}
                onChange={(e) =>
                  setEditing((x) =>
                    x ? { ...x, [timeKey]: e.target.value } : null,
                  )
                }
              />
            </label>
            <label className="field">
              Description <span className="optional">Optional</span>
              <Textarea
                rows={4}
                maxLength={1500}
                value={editing?.description || ""}
                onChange={(e) =>
                  setEditing((x) =>
                    x ? { ...x, description: e.target.value } : null,
                  )
                }
              />
            </label>
            <Button
              type="button"
              className="btn-primary"
              disabled={!editing?.title.trim()}
              onClick={() => {
                if (!editing) return;
                const value = { ...editing, title: editing.title.trim() };
                onChange(
                  items.some((i) => i.id === value.id)
                    ? items.map((i) => (i.id === value.id ? value : i))
                    : [...items, value],
                );
                setEditing(null);
              }}
            >
              Save to profile draft
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!removing} onOpenChange={(v) => !v && setRemoving(null)}>
        <DialogContent className="mark-dialog">
          <DialogTitle>Remove this entry?</DialogTitle>
          <DialogDescription>
            This updates your profile draft. Published portfolios remain
            unchanged until you publish again.
          </DialogDescription>
          <div className="row">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRemoving(null)}
            >
              Keep entry
            </Button>
            <Button
              type="button"
              className="btn-primary"
              onClick={() => {
                onChange(items.filter((i) => i.id !== removing));
                setRemoving(null);
              }}
            >
              Remove entry
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export function ValidationSummary({
  errors,
}: {
  errors: Record<string, string>;
}) {
  return Object.keys(errors).length ? (
    <div role="alert" className="validation-summary">
      <strong>A few things need attention</strong>
      <ul>
        {Object.entries(errors).map(([key, msg]) => (
          <li key={key}>{msg}</li>
        ))}
      </ul>
    </div>
  ) : null;
}
