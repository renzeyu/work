export const DEFAULT_NOTION_RECRUITER_FLOW_ID = "overview";

export const NOTION_RECRUITER_FLOWS = Object.freeze([
  {
    id: "overview",
    label: "What should I know about Zeyu?",
    icon: "overview",
    planSummary:
      "I’ll review Zeyu’s positioning, featured work, and strengths to give you a concise overview.",
    planChunks: Object.freeze([
      "I’ll review",
      " Zeyu’s positioning,",
      " featured work,",
      " and strengths",
      " to give you",
      " a concise overview.",
    ]),
    searchSummary: "Searching Zeyu’s portfolio and featured work",
    checklist: Object.freeze([
      "Review portfolio introduction",
      "Compare representative Notion and Reddit work",
      "Summarize focus and range",
    ]),
    response: {
      intro:
        "Zeyu is a senior product motion designer who uses motion to make interfaces easier to understand, product systems more expressive, and launch stories more memorable.",
      sections: Object.freeze([
        {
          title: "What sets him apart",
          items: Object.freeze([
            "His work spans interaction design, motion systems, campaigns, character animation, and end-to-end production for teams including Notion and Reddit.",
            "He moves comfortably between a single polished interaction and a reusable system an entire team can use—from leading Reddit’s UX motion language to building a no-keyframe After Effects typer for Notion’s event team.",
          ]),
        },
      ]),
      closing:
        "He is strongest when motion needs to work as both polished craft and a repeatable product capability.",
    },
  },
  {
    id: "ownership",
    label: "What did Zeyu personally own?",
    icon: "ownership",
    planSummary:
      "I’ll trace Zeyu’s direct responsibilities across the featured projects and separate them from the wider team’s work.",
    planChunks: Object.freeze([
      "I’ll trace",
      " Zeyu’s direct responsibilities",
      " across the featured projects",
      " and separate them",
      " from the wider",
      " team’s work.",
    ]),
    searchSummary: "Searching project credits and responsibilities",
    checklist: Object.freeze([
      "Review documented project credits",
      "Separate direct ownership from team outcomes",
      "Summarize responsibilities across projects",
    ]),
    response: {
      intro: "Zeyu has owned work from early direction through final delivery.",
      sections: Object.freeze([
        {
          title: "At Reddit",
          items: Object.freeze([
            "He led Reddit’s UX motion system and led motion design for the 2022 Recap product cards and campaign materials.",
            "For r/Place, he led motion across UX, the return teaser, and an internal technical-review film, including art direction, storyboarding, and animation.",
            "For Reddit’s IPO social film, he handled pre-production, shooting, editing, and color grading.",
          ]),
        },
        {
          title: "At Notion",
          items: Object.freeze([
            "He created Make with Notion interstitials, produced the Notion 3.0 keynote, and built a reusable After Effects typer for the team.",
          ]),
        },
      ]),
      closing:
        "His contribution is rarely limited to execution—he helps define the approach, builds the system, and carries it through production.",
    },
  },
  {
    id: "impact",
    label: "Which projects show measurable impact?",
    icon: "impact",
    planSummary:
      "I’ll review the case studies for reported reach, engagement, and product impact, then connect those outcomes to Zeyu’s role.",
    planChunks: Object.freeze([
      "I’ll review",
      " the case studies",
      " for reported reach,",
      " engagement, and product impact,",
      " then connect those outcomes",
      " to Zeyu’s role.",
    ]),
    searchSummary: "Searching case-study outcomes and metrics",
    checklist: Object.freeze([
      "Collect reported project metrics",
      "Check Zeyu’s role in each project",
      "Separate team outcomes from attribution",
    ]),
    response: {
      intro: "The clearest product-scale example is Reddit Recap 2022.",
      sections: Object.freeze([
        {
          title: "Reported outcomes",
          items: Object.freeze([
            "The project reached 21 million viewers against a 12 million goal and reactivated 1.3 million users.",
            "Among lower-usage viewers, the case study reports 10–20% higher 28-day retention and 2–4× more contributions after viewing.",
          ]),
        },
        {
          title: "Zeyu’s role",
          items: Object.freeze([
            "Zeyu led motion for the product cards and campaign materials while partnering with product and engineering teams.",
            "His r/Place return teaser also received 46.2K upvotes.",
          ]),
        },
      ]),
      closing:
        "These are team outcomes rather than results attributable to motion alone, but they show his work shipping inside highly visible programs at significant scale.",
    },
  },
  {
    id: "collaboration",
    label: "How does Zeyu work with teams?",
    icon: "collaboration",
    planSummary:
      "I’ll look across product, brand, and engineering examples to show how Zeyu works with teams.",
    planChunks: Object.freeze([
      "I’ll look",
      " across product, brand,",
      " and engineering examples",
      " to show how",
      " Zeyu works",
      " with teams.",
    ]),
    searchSummary: "Searching collaboration notes and team context",
    checklist: Object.freeze([
      "Review cross-functional project examples",
      "Trace systems and production handoffs",
      "Summarize Zeyu’s working style",
    ]),
    response: {
      intro:
        "Zeyu works across brand, product, and engineering rather than waiting for finished screens to animate.",
      sections: Object.freeze([
        {
          title: "In practice",
          items: Object.freeze([
            "For Reddit Recap, he partnered with product designers, engineers, and backend teams on cross-platform UI motion, privacy controls, and shareable assets.",
            "For Reddit’s product language, he translated brand principles into reusable motion guidance.",
            "At Notion, he helped turn a custom shape font into a teammate-friendly After Effects tool.",
          ]),
        },
      ]),
      closing:
        "His usual pattern is to clarify the intent, prototype the behavior, turn the strongest idea into a repeatable system, and stay involved through final production.",
    },
  },
]);

const FLOW_BY_ID = new Map(
  NOTION_RECRUITER_FLOWS.map((flow) => [flow.id, flow]),
);

export function getNotionRecruiterFlowById(flowId) {
  return (
    FLOW_BY_ID.get(flowId) ?? FLOW_BY_ID.get(DEFAULT_NOTION_RECRUITER_FLOW_ID)
  );
}

export function getNotionRecruiterFlow(prompt) {
  const normalizedPrompt = prompt.trim().toLocaleLowerCase();
  const exactMatch = NOTION_RECRUITER_FLOWS.find(
    (flow) => flow.label.toLocaleLowerCase() === normalizedPrompt,
  );
  if (exactMatch) return exactMatch;

  if (/impact|metric|outcome|result|perform|retention|viewer|scale/.test(normalizedPrompt)) {
    return getNotionRecruiterFlowById("impact");
  }
  if (/collabor|team|partner|work with|working style/.test(normalizedPrompt)) {
    return getNotionRecruiterFlowById("collaboration");
  }
  if (/own|responsib|role|credit|contribut|made|make for/.test(normalizedPrompt)) {
    return getNotionRecruiterFlowById("ownership");
  }
  return getNotionRecruiterFlowById(DEFAULT_NOTION_RECRUITER_FLOW_ID);
}

const RESPONSE_CHUNK_PATTERN = Object.freeze([6, 8, 5, 9, 6]);

function tokenize(value) {
  return value.match(/\S+\s*/g) ?? [];
}

export function flattenNotionResponse(response) {
  return [
    response.intro,
    ...response.sections.flatMap(({ title, items }) => [title, ...items]),
    response.closing,
  ].join("\n");
}

export function createNotionResponseModel(response) {
  const segments = [
    { id: "intro", value: response.intro },
    ...response.sections.flatMap((section, sectionIndex) => [
      { id: `section-${sectionIndex}-title`, value: section.title },
      ...section.items.map((item, itemIndex) => ({
        id: `section-${sectionIndex}-item-${itemIndex}`,
        value: item,
      })),
    ]),
    { id: "closing", value: response.closing },
  ].map((segment) => ({ ...segment, tokens: tokenize(segment.value) }));

  let offset = 0;
  const segmentOffsets = segments.map((segment) => {
    const entry = {
      id: segment.id,
      start: offset,
      end: offset + segment.tokens.length,
    };
    offset = entry.end;
    return entry;
  });

  const arrivalRanges = [];
  let start = 0;
  let index = 0;
  while (start < offset) {
    const size = RESPONSE_CHUNK_PATTERN[index % RESPONSE_CHUNK_PATTERN.length];
    const end = Math.min(offset, start + size);
    arrivalRanges.push({ index, start, end });
    start = end;
    index += 1;
  }

  return {
    segments,
    segmentOffsets,
    arrivalRanges,
    wordTotal: offset,
    closingWordTotal: tokenize(response.closing).length,
  };
}

const defaultFlow = getNotionRecruiterFlowById(
  DEFAULT_NOTION_RECRUITER_FLOW_ID,
);

export const NOTION_PLAN_SUMMARY = defaultFlow.planSummary;
export const NOTION_CHECKLIST_LABELS = defaultFlow.checklist;

export const NOTION_CHAT_STAGES = Object.freeze([
  { id: "plan", dwellMs: 1_700 },
  { id: "searching", dwellMs: 700 },
  { id: "found-results", dwellMs: 1_150 },
  { id: "searching-web", dwellMs: 1_100 },
  { id: "searched-web", dwellMs: 900 },
  { id: "updating-todos", dwellMs: 1_100 },
  { id: "updated-todos", dwellMs: 900 },
  { id: "todo-ready", dwellMs: 700 },
  { id: "todo-1", dwellMs: 760 },
  { id: "todo-2", dwellMs: 760 },
  { id: "todo-3", dwellMs: 520 },
  { id: "answering", dwellMs: null },
]);

const FINAL_TOOL_ROWS = Object.freeze([
  Object.freeze({ label: "Found 37 results", state: "done", hasPageBadge: true }),
  Object.freeze({ label: "Searched the web", state: "done", hasPageBadge: false }),
  Object.freeze({ label: "Updated to-dos", state: "done", hasPageBadge: false }),
]);

/**
 * Pure view-model derivation for the timed tool ledger. Keeping this separate
 * makes the interaction ordering regression-testable without waiting on timers.
 */
export function getNotionActivity(
  stageId,
  flowId = DEFAULT_NOTION_RECRUITER_FLOW_ID,
) {
  const flow = getNotionRecruiterFlowById(flowId);

  switch (stageId) {
    case "searching":
      return {
        summary: flow.searchSummary,
        rows: [],
        showChecklist: false,
        checklistProgress: 0,
      };
    case "found-results":
      return {
        summary: "Found 37 results",
        rows: [FINAL_TOOL_ROWS[0]],
        showChecklist: false,
        checklistProgress: 0,
      };
    case "searching-web":
      return {
        summary: "Searching the web",
        rows: [
          FINAL_TOOL_ROWS[0],
          { label: "Searching the web", state: "live", hasPageBadge: false },
        ],
        showChecklist: false,
        checklistProgress: 0,
      };
    case "searched-web":
      return {
        summary: "Searched the web",
        rows: FINAL_TOOL_ROWS.slice(0, 2),
        showChecklist: false,
        checklistProgress: 0,
      };
    case "updating-todos":
      return {
        summary: "Updating to-dos",
        rows: [
          ...FINAL_TOOL_ROWS.slice(0, 2),
          { label: "Updating to-dos", state: "live", hasPageBadge: false },
        ],
        showChecklist: false,
        checklistProgress: 0,
      };
    case "updated-todos":
      return {
        summary: "Updated to-dos",
        rows: FINAL_TOOL_ROWS,
        showChecklist: false,
        checklistProgress: 0,
      };
    case "todo-ready":
    case "todo-1":
    case "todo-2":
    case "todo-3":
    case "answering": {
      const checklistProgress = {
        "todo-ready": 0,
        "todo-1": 1,
        "todo-2": 2,
        "todo-3": 3,
        answering: 3,
      }[stageId];

      return {
        summary: "3 steps",
        rows: FINAL_TOOL_ROWS,
        showChecklist: true,
        checklistProgress,
      };
    }
    default:
      return null;
  }
}
