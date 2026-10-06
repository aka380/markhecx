export const information: Record<
  string,
  {
    eyebrow: string;
    title: string;
    description: string;
    sections: { title: string; body: string }[];
  }
> = {
  about: {
    eyebrow: "BEHIND MARKHECX",
    title: "People are more than a title.",
    description:
      "MarkHECX brings creative identity, work, and growth into the same space.",
    sections: [
      {
        title: "A home for your whole identity",
        body: "Your projects, skills, and interests tell a richer story than a single job title. MarkHECX is a space to bring those pieces together and make them easier to discover.",
      },
      {
        title: "Better work starts with better connections",
        body: "Explore creators across disciplines, learn from their work, and find shared interests. This foundation begins with sample profiles; community features are planned for a future phase.",
      },
      {
        title: "Clarity with HECX",
        body: "HECX is designed to help creators reflect on their strengths, projects, and next steps. The current workspace demonstrates those interactions with clearly labeled scripted responses.",
      },
      {
        title: "An early chapter",
        body: "This build establishes the product’s visual language and frontend foundation. Team profiles have not been added yet.",
      },
    ],
  },
  guidelines: {
    eyebrow: "BUILD GOOD COMPANY",
    title: "Create with care.",
    description: "A foundation for a thoughtful, respectful creator community.",
    sections: [
      {
        title: "Represent your work honestly",
        body: "Describe your own contribution, credit collaborators, and clearly identify sample or AI-assisted work. Do not invent achievements or use someone else’s work as your own.",
      },
      {
        title: "Respect people and their boundaries",
        body: "Offer specific, constructive feedback. Keep communication relevant and respectful. Never share another person’s private details without permission.",
      },
      {
        title: "Keep ownership clear",
        body: "Only upload content you have permission to use. Link to original sources and explain your role when presenting shared projects.",
      },
      {
        title: "Understand this demo",
        body: "Profiles shown in discovery are illustrative. Local sign-in is not secure authentication. Messages, notifications, payments, public publishing, and live AI are not connected in this demo.",
      },
    ],
  },
  help: {
    eyebrow: "A LITTLE GUIDANCE",
    title: "Find your way around.",
    description: "A few things to know about your MarkHECX workspace.",
    sections: [
      {
        title: "How does local sign-in work?",
        body: "Choose Sign In or Sign Up and enter a display name. This browser stores one local profile with no password or identity verification. Signing out hides your workspace and preserves the draft on this device.",
      },
      {
        title: "How do I create a portfolio?",
        body: "Open Create → Portfolio → Customize. Choose a template, toggle and reorder sections, and select your featured projects. Preview your draft and choose visibility before publishing locally.",
      },
      {
        title: "Can I share my published portfolio?",
        body: "Publishing creates a local version at /u/your-username. Public and unlisted links work within this browser. Cross-device storage and sharing require a future backend.",
      },
      {
        title: "Is HECX connected to AI?",
        body: "No. Every response is a scripted demonstration. HECX has a replaceable service adapter for future AI integration. No prompts are sent to a model.",
      },
      {
        title: "Where is my data saved?",
        body: "Profile details, saved creators, and portfolio drafts use this browser’s local storage. Clearing site data removes them. No cloud synchronization or backup is provided in Phase 1.",
      },
    ],
  },
  resources: {
    eyebrow: "MAKE YOUR NEXT MOVE",
    title: "A little direction goes a long way.",
    description: "Practical starting points for your creative work.",
    sections: [
      {
        title: "The project story checklist",
        body: "Name the problem. Explain who it affected. Describe your role and the choices you made. Show what changed and reflect on what you would do differently.",
      },
      {
        title: "The portfolio edit",
        body: "Choose your strongest work. Give each project a short, clear introduction. Make your contribution visible. Remove details that distract from the story.",
      },
      {
        title: "The collaboration brief",
        body: "Agree on the goal, the people involved, each person’s responsibilities, available time, and how you will communicate. Keep the first milestone small.",
      },
      {
        title: "The skill-building loop",
        body: "Pick one skill. Create a small project that uses it. Ask for specific feedback, improve one thing, and document what you learned.",
      },
    ],
  },
};
