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
            {project.creative && (
              <section>
                <h3>Creative workflow</h3>
                <p>Self-declared evidence; not independently verified.</p>
                <p>{project.creative.specialization}</p>
                <p>
                  Tools:{" "}
                  {project.creative.tools.join(", ") || "Evidence unavailable."}
                </p>
                <p>
                  Models:{" "}
                  {project.creative.models.join(", ") ||
                    "Evidence unavailable."}
                </p>
                <p>{project.creative.workflow}</p>
                <p>Formats: {project.creative.formats.join(", ")}</p>
                <p>Commercial use: {project.creative.commercialUse}</p>
              </section>
            )}

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
