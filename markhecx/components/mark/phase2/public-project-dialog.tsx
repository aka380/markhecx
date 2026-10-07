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
                <p>
                  Aspect ratio:{" "}
                  {project.creative.aspectRatio || "Not specified"}
                </p>
                <p>
                  {project.creative.toolEvidence.length || project.creative.workflowEvidence.length || project.creative.pastWorkEvidence.length
                    ? "Evidence submitted · review the supplied references below."
                    : "Creator declared · supporting evidence not submitted."}
                </p>
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
                {!!project.creative.workflowSteps.length && <p>Steps: {project.creative.workflowSteps.join(" → ")}</p>}
                {project.creative.humanContribution && <p><strong>Human contribution:</strong> {project.creative.humanContribution}</p>}
                {project.creative.sourceAssets && <p><strong>Source assets:</strong> {project.creative.sourceAssets}</p>}
                <p>Formats: {project.creative.formats.join(", ")}</p>
                <p>Commercial use: {project.creative.commercialUse}</p>
                {[...project.creative.toolEvidence, ...project.creative.workflowEvidence, ...project.creative.pastWorkEvidence].map((evidence) => (
                  <p key={evidence} className="small-note">Evidence supplied: {evidence}</p>
                ))}
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
