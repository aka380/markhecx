"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { SlidersHorizontal, X, Search, Sparkles } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { creators } from "@/lib/mark/data";
import {
  discoveryCategories,
  discoveryViews,
  readDiscoveryQuery,
  runDiscovery,
  updateDiscoveryQuery,
  creatorCategories,
} from "@/lib/mark/discovery";
import { useApp, SignInGate } from "./provider";
import { PageTitle, Badge, Choice, EmptyState, Button, Action } from "./ui";
import { CreatorCard } from "./creator-card";
import { CreatorSearch } from "./discovery/creator-search";
import { DiscoveryFilters } from "./discovery/filters";
import { CreatorGridSkeleton } from "./discovery/loading";
import { useDiscoveryCreators } from "./discovery/use-discovery";
import { PublicCreatorProfile } from "./phase2/public-creator";

export function CreatorsPage({ savedRoute = false }: { savedRoute?: boolean }) {
  const params = useSearchParams(),
    router = useRouter();
  const { state, ready } = useApp();
  const pool = useDiscoveryCreators();
  const [filtersOpen, setFiltersOpen] = useState(false),
    [desktopFilters, setDesktopFilters] = useState(false),
    [more, setMore] = useState(false);
  const [pending, startTransition] = useTransition();
  const query = useMemo(
    () =>
      readDiscoveryQuery(
        new URLSearchParams(params.toString()),
        state.signedIn,
        savedRoute,
      ),
    [params, state.signedIn, savedRoute],
  );
  function navigate(patch: Record<string, string | string[]>) {
    const current = new URLSearchParams(params.toString());
    if (savedRoute) current.set("view", "Saved");
    startTransition(() =>
      router.replace("/creators?" + updateDiscoveryQuery(current, patch), {
        scroll: false,
      }),
    );
  }
  const outcome = useMemo(
    () =>
      runDiscovery(
        pool,
        query,
        state.signedIn,
        state.accountType === "Brand" ? state.brandSaved : state.saved,
        state.signedIn
          ? { profile: state.profile, projects: state.projects }
          : null,
      ),
    [
      pool,
      query,
      state.signedIn,
      state.accountType,
      state.brandSaved,
      state.saved,
      state.profile,
      state.projects,
    ],
  );
  const returnTo =
    "/creators?" +
    updateDiscoveryQuery(new URLSearchParams(params.toString()), {
      view: query.view,
    });
  const clearFilters = () =>
    navigate({
      category: "",
      skill: [],
      identity: "",
      availability: "",
      experience: "",
      projects: "",
      portfolio: "",
    });
  const activeFilters = [
    ...[
      "category",
      "identity",
      "availability",
      "experience",
      "projects",
      "portfolio",
    ].flatMap((key) =>
      query[key as keyof typeof query]
        ? [{ key, value: String(query[key as keyof typeof query]) }]
        : [],
    ),
    ...query.skills.map((value) => ({ key: "skill", value })),
  ];
  const filterControls = (
    <DiscoveryFilters pool={pool} filters={query} onChange={navigate} />
  );
  const extraCategories = [...new Set(pool.flatMap(creatorCategories))].filter(
    (c) => !discoveryCategories.includes(c),
  );
  const privateView =
    ["Saved", "Recommended"].includes(query.view) && !state.signedIn;
  return (
    <div className="page-enter discover-page">
      <PageTitle
        eyebrow="DISCOVER YOUR PEOPLE"
        title="Discover Creators"
        description="Find creators, builders, designers, developers and experts across the MarkHECX ecosystem."
      >
        <Badge>Sample community + local public profiles</Badge>
      </PageTitle>
      <div className="discover-search-area">
        <CreatorSearch
          value={query.q}
          onChange={(q) => navigate({ q, view: "All Creators" })}
        />
        <span className="small-note">
          A skill, a project, or a person. Start anywhere.
        </span>
      </div>
      <div className="category-chips" aria-label="Creator categories">
        <button
          aria-pressed={!query.category}
          className={!query.category ? "selected" : ""}
          onClick={() => navigate({ category: "" })}
        >
          All categories
        </button>
        {discoveryCategories.map((c) => (
          <button
            key={c}
            aria-pressed={query.category === c}
            className={query.category === c ? "selected" : ""}
            onClick={() => navigate({ category: c, view: "All Creators" })}
          >
            {c}
          </button>
        ))}
        <button aria-expanded={more} onClick={() => setMore(!more)}>
          More
        </button>
      </div>
      {more && (
        <div className="category-chips" aria-label="More categories">
          {extraCategories.map((c) => (
            <button
              key={c}
              aria-pressed={query.category === c}
              onClick={() => navigate({ category: c, view: "All Creators" })}
            >
              {c}
            </button>
          ))}
        </div>
      )}
      <Tabs
        value={query.view}
        onValueChange={(view) =>
          navigate({
            view,
            sort:
              view === "New Creators"
                ? "Recently Joined"
                : view === "Trending"
                  ? "Trending"
                  : view === "Recommended"
                    ? "Recommended"
                    : query.sort,
          })
        }
      >
        <div className="tabs-scroll">
          <TabsList className="discovery-tabs" variant="line">
            {discoveryViews.map((v) => (
              <TabsTrigger key={v} value={v}>
                {v}
                {v === "Saved" && state.signedIn && (
                  <span className="tab-count">
                    {
                      pool.filter((c) =>
                        (state.accountType === "Brand"
                          ? state.brandSaved
                          : state.saved
                        ).includes(c.id),
                      ).length
                    }
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>
      <div className="discovery-controls">
        <div className="row">
          <Button
            className="btn-secondary desktop-filter-trigger"
            aria-expanded={desktopFilters}
            onClick={() => setDesktopFilters(!desktopFilters)}
          >
            <SlidersHorizontal size={16} />
            Filters{activeFilters.length ? ` (${activeFilters.length})` : ""}
          </Button>
          <Button
            className="btn-secondary mobile-filter-trigger"
            onClick={() => setFiltersOpen(true)}
          >
            <SlidersHorizontal size={16} />
            Filters{activeFilters.length ? ` (${activeFilters.length})` : ""}
          </Button>
          {activeFilters.length > 0 && (
            <Button variant="ghost" onClick={clearFilters}>
              Reset filters
            </Button>
          )}
        </div>
        <Choice
          label="Sort creators"
          value={query.sort}
          onChange={(sort) => navigate({ sort })}
          options={[
            ...(state.signedIn ? ["Recommended"] : []),
            "Most Relevant",
            ...(pool.some((c) => c.trending) ? ["Trending"] : []),
            ...(pool.some((c) => c.joinedAt) ? ["Recently Joined"] : []),
            "Most Projects",
            "Name A–Z",
            ...(!state.signedIn && query.sort === "Recommended"
              ? ["Recommended"]
              : []),
          ]}
        />
      </div>
      {desktopFilters && (
        <div className="desktop-discovery-filters">{filterControls}</div>
      )}
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="bottom" className="discovery-filter-sheet">
          <SheetTitle>Find your people</SheetTitle>
          <SheetDescription>
            Combine filters to narrow your search. Skills match all selected
            values.
          </SheetDescription>
          {filterControls}
          <div className="row">
            <Button
              className="btn-primary"
              onClick={() => setFiltersOpen(false)}
            >
              Show {outcome.results.length} creators
            </Button>
            <Button variant="ghost" onClick={clearFilters}>
              Reset filters
            </Button>
          </div>
        </SheetContent>
      </Sheet>
      {!!activeFilters.length && (
        <div className="active-filter-chips">
          {activeFilters.map((f) => (
            <Button
              variant="ghost"
              key={f.key + f.value}
              aria-label={`Remove ${f.value} filter`}
              onClick={() =>
                navigate({
                  [f.key]:
                    f.key === "skill"
                      ? query.skills.filter((s) => s !== f.value)
                      : "",
                })
              }
            >
              {f.value}
              <X size={13} />
            </Button>
          ))}
        </div>
      )}
      {query.view === "Trending" && (
        <p className="info-line">
          Trending is an editorial demo selection. No live analytics or
          popularity counts are connected.
        </p>
      )}
      {query.view === "New Creators" && (
        <p className="info-line">
          Newest dated sample profiles. Creators without a recorded join date
          are omitted.
        </p>
      )}
      {query.view === "Recommended" && state.signedIn && (
        <p className="info-line">
          <Sparkles size={16} />
          HECX · Local matching from your profile and published projects. Open a
          card’s explanation to see the evidence.
        </p>
      )}
      {!ready ? (
        <CreatorGridSkeleton />
      ) : privateView ? (
        <SignInGate
          title={
            query.view === "Saved"
              ? "Keep good company close"
              : "Discover your creative connections"
          }
          description="Sign in locally to use your saved collection and profile-based recommendations."
        />
      ) : (
        <>
          <div className="results-heading" role="status" aria-live="polite">
            <span>
              {outcome.results.length}{" "}
              {outcome.results.length === 1 ? "creator" : "creators"} found
              {query.q ? ` for “${query.q}”` : ""}
            </span>
            <span>
              {pending
                ? "Updating results…"
                : query.view === "Recommended"
                  ? "For you"
                  : "Find your next collaborator"}
            </span>
          </div>
          <div
            aria-busy={pending}
            className={`discovery-results ${pending ? "updating" : ""}`}
          >
            {outcome.results.length ? (
              <div className="creator-grid">
                {outcome.results.map((c, i) => (
                  <div
                    className="creator-result"
                    key={c.id}
                    style={{ animationDelay: `${Math.min(i, 8) * 35}ms` }}
                  >
                    <CreatorCard
                      creator={c}
                      returnTo={returnTo}
                      recommendation={
                        state.signedIn
                          ? outcome.recommendations.find(
                              (r) => r.creatorId === c.id,
                            )
                          : undefined
                      }
                    />
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="empty-icon">
                  <Search />
                </div>
                <EmptyState
                  title={
                    query.view === "Saved" && !query.q && !activeFilters.length
                      ? "No saved creators yet"
                      : query.view === "Recommended" &&
                          !query.q &&
                          !activeFilters.length
                        ? "No recommendations yet"
                        : "No creators found"
                  }
                  description={
                    query.view === "Recommended"
                      ? "Add your real skills, interests, or projects to help HECX find relevant creators. You can still explore everyone."
                      : query.view === "Saved"
                        ? "Save a creator to return to their work. If you have filters selected, try widening them."
                        : "Try another skill, category, creator identity, or project name. You can also remove a filter."
                  }
                >
                  {query.view === "Recommended" && (
                    <Action href="/profile/edit" secondary>
                      Edit your profile
                    </Action>
                  )}
                  <Button
                    className="btn-secondary"
                    onClick={() =>
                      navigate({
                        q: "",
                        view: "All Creators",
                        category: "",
                        skill: [],
                        identity: "",
                        availability: "",
                        experience: "",
                        projects: "",
                        portfolio: "",
                      })
                    }
                  >
                    Explore all creators
                  </Button>
                </EmptyState>
              </>
            )}
          </div>
        </>
      )}
      <p className="sample-footnote">
        Sample profiles are fictional. Your published profile stays
        browser-local. No live community, messaging delivery, or AI service is
        connected.
      </p>
    </div>
  );
}
/** Retain existing Phase 1 links while using the shared Phase 2 public profile. */
export function CreatorProfile({ id }: { id: string }) {
  const c = creators.find((c) => c.id === id);
  return (
    <PublicCreatorProfile username={c?.username} localOnly={id === "local"} />
  );
}
