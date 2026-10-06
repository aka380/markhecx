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
        body: "Explore creators across disciplines, learn from their work, and find shared interests. Published profiles and campaign collaborations connect creators with brands.",
      },
      {
        title: "Clarity with HECX",
        body: "HECX is designed to help creators reflect on their strengths, projects, and next steps. Analysis identifies its configured provider and presents suggestions for your review.",
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
        title: "Understand the platform",
        body: "Discovery shows published creator profiles. Accounts, messages, notifications, and portfolios use the connected backend. Sample showcases are labeled separately. Payments are not connected. AI suggestions require review before applying.",
      },
    ],
  },
  help: {
    eyebrow: "A LITTLE GUIDANCE",
    title: "Find your way around.",
    description: "A few things to know about your MarkHECX workspace.",
    sections: [
      {
        title: "How does sign-in work?",
        body: "Create a Creator or Brand account with your name, email, and a password of at least 12 characters. Sign in to access your saved workspace. Sign out before switching to another account.",
      },
      {
        title: "How do I create a portfolio?",
        body: "Open Create → Portfolio → Customize. Choose a template, toggle and reorder sections, and select your featured projects. Preview your draft and choose visibility before publishing.",
      },
      {
        title: "Can I share my published portfolio?",
        body: "Publishing saves a snapshot at /u/your-username. Public portfolios appear in discovery. Unlisted portfolios are available by link. Private portfolios are visible only to the signed-in owner.",
      },
      {
        title: "Is HECX connected to AI?",
        body: "HECX runs on the backend with configurable Gemini analysis and deterministic, explainable matching. Each analysis identifies its provider; proposed changes require your review.",
      },
      {
        title: "Where is my data saved?",
        body: "Profile details, projects, portfolios, campaigns, applications, invitations, and messages are stored in the connected database and scoped to your account.",
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
