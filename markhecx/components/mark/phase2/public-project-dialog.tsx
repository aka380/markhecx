"use client";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Project } from "@/lib/mark/models";
export function PublicProjectDialog({
  project,
  onClose,
}: {
  project: Project | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!project} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="mark-dialog public-project-dialog">
        <DialogTitle>{project?.title}</DialogTitle>
        <DialogDescription>
          {project?.description || "The creator’s project details."}
        </DialogDescription>
        {project && (
          <div className="stack">
            {project.media
              .filter((m) => m.type === "image")
              .map((m) => (
                <img
                  className="detail-image"
                  key={m.id}
                  src={m.url}
                  alt={m.alt || project.title}
                />
              ))}
            {[
              ["Problem", project.problem],
              ["Solution", project.solution],
              ["Contribution", project.contribution],
            ]
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <div key={label}>
                  <h3>{label}</h3>
                  <p className="portfolio-text section-copy">{value}</p>
                </div>
              ))}
            {project.media
              .filter((m) => m.type === "video")
              .map((m) => (
                <a
                  className="text-link"
                  key={m.id}
                  href={m.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Watch project video
                </a>
              ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
