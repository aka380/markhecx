"use client";
import { creators as samples } from "@/lib/mark/data";
import { useDiscoveryCreators } from "./discovery/use-discovery";
import { useApp, SignInGate } from "./provider";
import { PageTitle, EmptyState, Action } from "./ui";
import { PublicPortfolio } from "./phase2/portfolio-pages";
import { PortfolioView } from "./portfolio-view";
export function PortfolioPage({ id }: { id: string }) {
  const { state } = useApp();
  const creators = useDiscoveryCreators();
  if (id === "mine" && state.publication)
    return <PublicPortfolio username={state.publication.portfolio.username} />;
  if (id === "mine") {
    if (!state.signedIn) return <SignInGate />;
    if (!state.published)
      return (
        <EmptyState
          title="Your portfolio isn’t published yet."
          description="Build your first draft and publish a local snapshot."
        >
          <Action href="/portfolio">Open studio</Action>
        </EmptyState>
      );
    return (
      <div className="page-enter">
        <PageTitle
          eyebrow="LOCAL SNAPSHOT"
          title="Your published portfolio"
          description={`Saved on ${new Date(state.publishedAt!).toLocaleDateString()}. Visible only on this browser.`}
        >
          <Action href="/portfolio" secondary>
            Back to editor
          </Action>
        </PageTitle>
        <PortfolioView
          sections={state.published}
          profile={state.publishedProfile || state.profile}
        />
      </div>
    );
  }
  const sample = samples.find(x => x.id === id);
  const c = creators.find((x) => x.id === id) || sample;
  if (!c)
    return (
      <EmptyState
        title="Portfolio not found"
        description="Try one of the sample portfolios in creator discovery."
      >
        <Action href="/creators">Discover creators</Action>
      </EmptyState>
    );
  return <PublicPortfolio username={c.username} sampleMode={!!sample} />;
}
