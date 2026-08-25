"use client";

import {
  ArrowClockwise,
  Brain,
  CaretDown,
  Eyeglasses,
  MoonStars,
  Pause,
  Play,
  SlidersHorizontal,
  Sparkle,
  WarningCircle,
} from "@phosphor-icons/react";
import {
  Alignment,
  Fit,
  Layout,
  Rive,
  RuntimeLoader,
  StateMachineInputType,
  type Event as RiveRuntimeEvent,
  type StateMachineInput,
} from "@rive-app/webgl2";
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import styles from "./NoseyPrototype.module.css";

const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
const riveSource = `${basePath}/rive/notionai_assistant_antimatter_0414.riv`;
const riveWasm = `${basePath}/rive/rive.wasm`;
const riveWasmFallback = `${basePath}/rive/rive_fallback.wasm`;

type LoadStatus = "loading" | "ready" | "error";
type StateGroup = "base" | "focus" | "create" | "character";

type InputDescriptor = {
  initialValue?: boolean | number;
  name: string;
  type: StateMachineInputType;
  value?: boolean | number;
};

type MachineDescriptor = {
  inputs: InputDescriptor[];
  name: string;
};

type ArtboardDescriptor = {
  animations: string[];
  name: string;
  stateMachines: MachineDescriptor[];
};

type RiveContents = {
  artboards?: ArtboardDescriptor[];
};

type StateChoice = {
  group: StateGroup;
  id: string;
  label: string;
  outTrigger?: string;
  trigger: string;
};

type TransitionOrigin = "manual" | "random";

type TransitionPhase =
  | "booting"
  | "idle"
  | "starting"
  | "entering"
  | "looping"
  | "exiting"
  | "oneShot"
  | "recovering";

type TransitionController = {
  current: StateChoice | null;
  epoch: number;
  origin: TransitionOrigin;
  pending: StateChoice | null;
  pendingOrigin: TransitionOrigin;
  phase: TransitionPhase;
};

const stateChoices: StateChoice[] = [
  { id: "idle", label: "Idle", trigger: "IdleTrigger", group: "base" },
  { id: "greeting", label: "Greeting", trigger: "GreetingTrigger", group: "base" },
  { id: "error", label: "Error", trigger: "ErrorTrigger", group: "base" },
  {
    id: "thinking",
    label: "Thinking",
    trigger: "ThinkingInTrigger",
    outTrigger: "ThinkingOutTrigger",
    group: "focus",
  },
  {
    id: "searching",
    label: "Searching",
    trigger: "SearchingInTrigger",
    outTrigger: "SearchingOutTrigger",
    group: "focus",
  },
  {
    id: "research",
    label: "Research",
    trigger: "ResearchInTrigger",
    outTrigger: "ResearchOutTrigger",
    group: "focus",
  },
  {
    id: "writing",
    label: "Writing",
    trigger: "WritingInTrigger",
    outTrigger: "WritingOutTrigger",
    group: "create",
  },
  {
    id: "building",
    label: "Building",
    trigger: "BuildingInTrigger",
    outTrigger: "BuildingOutTrigger",
    group: "create",
  },
  {
    id: "other",
    label: "Other",
    trigger: "OtherInTrigger",
    outTrigger: "OtherOutTrigger",
    group: "create",
  },
  {
    id: "recording",
    label: "Recording",
    trigger: "RecordingInTrigger",
    outTrigger: "RecordingOutTrigger",
    group: "character",
  },
  {
    id: "glasses",
    label: "Glasses",
    trigger: "GlassesInTrigger",
    outTrigger: "GlassesOutTrigger",
    group: "character",
  },
  {
    id: "gear",
    label: "Gear",
    trigger: "GearInTrigger",
    outTrigger: "GearOutTrigger",
    group: "character",
  },
  {
    id: "hat",
    label: "Hat",
    trigger: "HatInTrigger",
    outTrigger: "HatOutTrigger",
    group: "character",
  },
];

const groupOrder: StateGroup[] = ["base", "focus", "create", "character"];

const idleChoice = stateChoices[0];

const activeStateNames: Record<string, string[]> = {
  thinking: ["thinking loop"],
  searching: ["searching loop"],
  research: ["research loop"],
  writing: ["writing loop"],
  building: ["building loop"],
  other: ["other loop"],
  recording: [
    "recording loop low",
    "recording loop med",
    "recording loop hi",
  ],
  glasses: ["glasses loop"],
  gear: ["gear loop"],
  hat: ["hat loop"],
};

const enteringStateNames: Record<string, string[]> = {
  thinking: ["thinking in"],
  searching: ["searching in"],
  research: ["research in"],
  writing: ["writing in"],
  building: ["building in"],
  other: ["other in"],
  recording: ["recording in"],
  glasses: ["glasses in"],
  gear: ["gear in"],
  hat: ["hat in"],
};

const groupDetails: Record<
  StateGroup,
  { icon: typeof MoonStars; label: string }
> = {
  base: { icon: MoonStars, label: "Core" },
  focus: { icon: Brain, label: "Thinking and research" },
  create: { icon: Sparkle, label: "Making" },
  character: { icon: Eyeglasses, label: "Voice and character" },
};

const cleanName = (name: string) =>
  Array.from(name)
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();

function titleCase(value: string) {
  return value.replace(/(^|\s)\p{L}/gu, (letter) => letter.toUpperCase());
}

function stateLabel(name: string) {
  const clean = cleanName(name);
  const lower = clean.toLowerCase();
  if (lower.includes("recoding_out_to error")) return "Recording to error";
  if (lower.includes("gear out to error")) return "Gear to error";
  if (lower === "base_idle") return "Base idle";
  return titleCase(
    clean
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/_/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function inputTypeLabel(type: StateMachineInputType) {
  if (type === StateMachineInputType.Boolean) return "Boolean";
  if (type === StateMachineInputType.Number) return "Number";
  return "Trigger";
}

function eventNames(event: RiveRuntimeEvent) {
  return Array.isArray(event.data) ? event.data.map(cleanName) : [];
}

function normalizedStateName(name: string) {
  return cleanName(name)
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function isIdleState(name: string) {
  const normalized = normalizedStateName(name);
  return normalized === "base idle" || /^idle(?: [abc])?$/.test(normalized);
}

function choiceFromTrigger(triggerName: string) {
  return stateChoices.find((choice) => choice.trigger === triggerName);
}

function choiceFromOutTrigger(triggerName: string) {
  return stateChoices.find((choice) => choice.outTrigger === triggerName);
}

function isActiveStateForChoice(name: string, choice: StateChoice) {
  const normalized = normalizedStateName(name);
  if (choice.id === "idle") return isIdleState(name);
  if (choice.id === "error" || choice.id === "greeting") {
    return normalized === choice.id;
  }
  return activeStateNames[choice.id]?.includes(normalized) ?? false;
}

function isEnteringStateForChoice(name: string, choice: StateChoice) {
  return (
    enteringStateNames[choice.id]?.includes(normalizedStateName(name)) ?? false
  );
}

function randomChoice<T>(choices: T[]) {
  if (!choices.length) return undefined;
  const randomValue = crypto.getRandomValues(new Uint32Array(1))[0];
  return choices[randomValue % choices.length];
}

type NoseyPrototypeProps = {
  variant?: "assistant" | "project" | "playground";
};

export function NoseyPrototype({ variant = "project" }: NoseyPrototypeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const riveRef = useRef<Rive | null>(null);
  const runtimeInputsRef = useRef<Map<string, StateMachineInput>>(new Map());
  const scheduledFrameRef = useRef<number | null>(null);
  const activeMachineRef = useRef("");
  const activeArtboardRef = useRef("");
  const pausedRef = useRef(false);
  const transitionRef = useRef<TransitionController>({
    current: null,
    epoch: 0,
    origin: "manual",
    pending: null,
    pendingOrigin: "manual",
    phase: "booting",
  });
  const transitionFrameRef = useRef<number | null>(null);
  const transitionWatchdogRef = useRef<number | null>(null);
  const randomReturnTimerRef = useRef<number | null>(null);
  const recoverMachineRef = useRef<() => void>(() => undefined);
  const beginExitRef = useRef<() => void>(() => undefined);

  const [reloadKey, setReloadKey] = useState(0);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [artboards, setArtboards] = useState<ArtboardDescriptor[]>([]);
  const [selectedArtboard, setSelectedArtboard] = useState("");
  const [selectedMachine, setSelectedMachine] = useState("");
  const [machineInputs, setMachineInputs] = useState<InputDescriptor[]>([]);
  const [activeChoice, setActiveChoice] = useState("idle");
  const [paused, setPaused] = useState(false);
  const [assistantEntranceArmed, setAssistantEntranceArmed] = useState(false);
  const [assistantEntranceDelay, setAssistantEntranceDelay] = useState(700);
  const assistantEntranceArmedRef = useRef(false);

  useLayoutEffect(() => {
    if (
      variant !== "assistant" ||
      status === "loading" ||
      assistantEntranceArmedRef.current
    ) {
      return;
    }

    assistantEntranceArmedRef.current = true;
    setAssistantEntranceDelay(Math.max(0, 700 - performance.now()));
    setAssistantEntranceArmed(true);
  }, [status, variant]);

  const currentArtboard = useMemo(
    () => artboards.find((artboard) => artboard.name === selectedArtboard),
    [artboards, selectedArtboard],
  );

  const groupedChoices = useMemo(
    () =>
      groupOrder.map((group) => ({
        choices: stateChoices.filter((choice) => choice.group === group),
        group,
      })),
    [],
  );

  const releaseRuntimeInputs = useCallback(() => {
    runtimeInputsRef.current.forEach((input) => input.delete());
    runtimeInputsRef.current.clear();
  }, []);

  const readMachineInputs = useCallback((machineName: string) => {
    const rive = riveRef.current;
    if (!rive || !machineName) {
      setMachineInputs([]);
      return;
    }

    releaseRuntimeInputs();
    const runtimeInputs = rive.stateMachineInputs(machineName);
    const nextInputs = runtimeInputs.map((input) => ({
      name: cleanName(input.name),
      type: input.type,
      value: input.value,
    }));
    runtimeInputsRef.current = new Map(
      runtimeInputs.map((input) => [cleanName(input.name), input]),
    );
    setMachineInputs(nextInputs);
  }, [releaseRuntimeInputs]);

  const fireInput = useCallback(
    (inputName: string, machineName: string, nextValue?: boolean | number) => {
      const rive = riveRef.current;
      if (!rive || !machineName) return false;

      const input = runtimeInputsRef.current.get(inputName);
      if (!input) return false;

      if (input.type === StateMachineInputType.Trigger) input.fire();
      if (
        input.type === StateMachineInputType.Boolean &&
        typeof nextValue === "boolean"
      ) {
        input.value = nextValue;
      }
      if (
        input.type === StateMachineInputType.Number &&
        typeof nextValue === "number"
      ) {
        input.value = nextValue;
      }

      if (typeof nextValue !== "undefined") {
        setMachineInputs((inputs) =>
          inputs.map((descriptor) =>
            descriptor.name === inputName
              ? { ...descriptor, value: nextValue }
              : descriptor,
          ),
        );
      }
      return true;
    },
    [],
  );

  const clearTransitionFrame = useCallback(() => {
    if (transitionFrameRef.current !== null) {
      window.cancelAnimationFrame(transitionFrameRef.current);
      transitionFrameRef.current = null;
    }
  }, []);

  const clearTransitionWatchdog = useCallback(() => {
    if (transitionWatchdogRef.current !== null) {
      window.clearTimeout(transitionWatchdogRef.current);
      transitionWatchdogRef.current = null;
    }
  }, []);

  const clearRandomReturn = useCallback(() => {
    if (randomReturnTimerRef.current !== null) {
      window.clearTimeout(randomReturnTimerRef.current);
      randomReturnTimerRef.current = null;
    }
  }, []);

  const armTransitionWatchdog = useCallback(
    (phase: TransitionPhase, choiceId: string) => {
      clearTransitionWatchdog();
      if (pausedRef.current) return;

      const epoch = transitionRef.current.epoch;
      transitionWatchdogRef.current = window.setTimeout(() => {
        transitionWatchdogRef.current = null;
        const controller = transitionRef.current;
        if (
          controller.epoch === epoch &&
          controller.phase === phase &&
          controller.current?.id === choiceId
        ) {
          recoverMachineRef.current();
        }
      }, 7000);
    },
    [clearTransitionWatchdog],
  );

  const armRandomReturn = useCallback(
    (choice: StateChoice, epoch: number) => {
      clearRandomReturn();
      randomReturnTimerRef.current = window.setTimeout(() => {
        randomReturnTimerRef.current = null;
        const controller = transitionRef.current;
        if (
          controller.epoch !== epoch ||
          controller.origin !== "random" ||
          controller.current?.id !== choice.id
        ) {
          return;
        }

        controller.pending = idleChoice;
        controller.pendingOrigin = "manual";
        if (controller.phase === "looping") beginExitRef.current();
      }, 2000);
    },
    [clearRandomReturn],
  );

  const startScheduledChoice = useCallback(() => {
    const controller = transitionRef.current;
    const choice = controller.current;
    const rive = riveRef.current;
    const machineName = activeMachineRef.current;
    if (
      controller.phase !== "starting" ||
      !choice ||
      !rive ||
      !machineName
    ) {
      return false;
    }

    controller.phase = choice.outTrigger ? "entering" : "oneShot";
    rive.play(machineName);
    pausedRef.current = false;
    setPaused(false);
    if (!fireInput(choice.trigger, machineName)) {
      recoverMachineRef.current();
      return false;
    }

    armTransitionWatchdog(controller.phase, choice.id);
    if (controller.origin === "random") {
      armRandomReturn(choice, controller.epoch);
    }
    return true;
  }, [armRandomReturn, armTransitionWatchdog, fireInput]);

  const scheduleChoiceStart = useCallback(
    (choice: StateChoice, origin: TransitionOrigin) => {
      clearTransitionFrame();
      const controller = transitionRef.current;
      controller.current = choice;
      controller.origin = origin;
      controller.pending = null;
      controller.pendingOrigin = "manual";

      if (choice.id === "idle") {
        controller.phase = "idle";
        setActiveChoice("idle");
        return;
      }

      controller.phase = "starting";
      const epoch = controller.epoch;
      transitionFrameRef.current = window.requestAnimationFrame(() => {
        transitionFrameRef.current = null;
        const latest = transitionRef.current;
        if (latest.epoch === epoch && latest.phase === "starting") {
          startScheduledChoice();
        }
      });
    },
    [clearTransitionFrame, startScheduledChoice],
  );

  const beginExit = useCallback(() => {
    const controller = transitionRef.current;
    const choice = controller.current;
    const rive = riveRef.current;
    const machineName = activeMachineRef.current;
    if (
      controller.phase !== "looping" ||
      !choice?.outTrigger ||
      !rive ||
      !machineName
    ) {
      return false;
    }

    clearRandomReturn();
    controller.phase = "exiting";
    rive.play(machineName);
    pausedRef.current = false;
    setPaused(false);
    if (!fireInput(choice.outTrigger, machineName)) {
      recoverMachineRef.current();
      return false;
    }

    armTransitionWatchdog("exiting", choice.id);
    return true;
  }, [armTransitionWatchdog, clearRandomReturn, fireInput]);

  useEffect(() => {
    beginExitRef.current = beginExit;
    return () => {
      beginExitRef.current = () => undefined;
    };
  }, [beginExit]);

  const completeIdleTransition = useCallback(() => {
    const controller = transitionRef.current;
    const pending = controller.pending;
    const pendingOrigin = controller.pendingOrigin;

    clearTransitionWatchdog();
    clearRandomReturn();
    controller.current = null;
    controller.origin = "manual";
    controller.pending = null;
    controller.pendingOrigin = "manual";
    controller.phase = "idle";
    setActiveChoice("idle");

    if (pending && pending.id !== "idle") {
      scheduleChoiceStart(pending, pendingOrigin);
    }
  }, [clearRandomReturn, clearTransitionWatchdog, scheduleChoiceStart]);

  const handleStateChanges = useCallback(
    (names: string[]) => {
      const controller = transitionRef.current;
      const phase = controller.phase;
      const choice = controller.current;

      if (phase === "exiting" || phase === "oneShot") {
        if (names.some(isIdleState)) completeIdleTransition();
        else if (
          phase === "oneShot" &&
          choice &&
          names.some((name) => isActiveStateForChoice(name, choice))
        ) {
          setActiveChoice(choice.id);
        }
        return;
      }

      if (phase === "entering" && choice) {
        if (
          names.some(
            (name) =>
              isEnteringStateForChoice(name, choice) ||
              isActiveStateForChoice(name, choice),
          )
        ) {
          setActiveChoice(choice.id);
        }

        if (names.some((name) => isActiveStateForChoice(name, choice))) {
          clearTransitionWatchdog();
          controller.phase = "looping";
          if (controller.pending) {
            clearTransitionFrame();
            const epoch = controller.epoch;
            transitionFrameRef.current = window.requestAnimationFrame(() => {
              transitionFrameRef.current = null;
              const latest = transitionRef.current;
              if (
                latest.epoch === epoch &&
                latest.phase === "looping" &&
                latest.pending
              ) {
                beginExit();
              }
            });
          }
        }
        return;
      }

      if (phase === "idle" && names.some(isIdleState)) {
        setActiveChoice("idle");
      }
    },
    [
      beginExit,
      clearTransitionFrame,
      clearTransitionWatchdog,
      completeIdleTransition,
    ],
  );

  const requestState = useCallback(
    (
      choice: StateChoice,
      origin: TransitionOrigin = "manual",
      forceReplay = false,
    ) => {
      const controller = transitionRef.current;
      const phase = controller.phase;
      if (!riveRef.current || status !== "ready" || !activeMachineRef.current) {
        return false;
      }

      if (origin === "random") {
        const randomAlreadyQueued =
          controller.pending !== null && controller.pendingOrigin === "random";
        const randomAlreadyPlaying =
          controller.current !== null && controller.origin === "random";
        if (randomAlreadyQueued || randomAlreadyPlaying || phase === "recovering") {
          return false;
        }
      } else {
        clearRandomReturn();
      }

      if (phase === "booting" || phase === "recovering") {
        if (origin === "random") return false;
        controller.pending = choice;
        controller.pendingOrigin = origin;
        return true;
      }

      if (phase === "idle") {
        scheduleChoiceStart(choice, origin);
        return true;
      }

      if (phase === "starting") {
        if (choice.id === "idle") {
          clearTransitionFrame();
          controller.current = null;
          controller.origin = "manual";
          controller.phase = "idle";
          setActiveChoice("idle");
          return true;
        }
        controller.current = choice;
        controller.origin = origin;
        controller.pending = null;
        controller.pendingOrigin = "manual";
        return true;
      }

      if (phase === "entering") {
        if (choice.id === controller.current?.id && !forceReplay) {
          controller.origin = origin;
          controller.pending = null;
          controller.pendingOrigin = "manual";
          return true;
        }
        controller.pending = choice;
        controller.pendingOrigin = origin;
        return true;
      }

      if (phase === "looping") {
        if (choice.id === controller.current?.id && !forceReplay) {
          controller.origin = origin;
          controller.pending = null;
          controller.pendingOrigin = "manual";
          return true;
        }
        controller.pending = choice;
        controller.pendingOrigin = origin;
        beginExit();
        return true;
      }

      if (phase === "oneShot") {
        if (choice.id === controller.current?.id && !forceReplay) return true;
        controller.pending = choice;
        controller.pendingOrigin = origin;
        return true;
      }

      if (phase === "exiting") {
        controller.pending = choice;
        controller.pendingOrigin = origin;
        return true;
      }

      return false;
    },
    [beginExit, clearRandomReturn, clearTransitionFrame, scheduleChoiceStart, status],
  );

  const resetMachineController = useCallback(
    (machineName: string, pending: StateChoice | null = null) => {
      const rive = riveRef.current;
      const artboardName = activeArtboardRef.current || selectedArtboard;
      if (!rive || !artboardName || !machineName) return;

      clearTransitionFrame();
      clearTransitionWatchdog();
      clearRandomReturn();
      if (scheduledFrameRef.current !== null) {
        window.cancelAnimationFrame(scheduledFrameRef.current);
        scheduledFrameRef.current = null;
      }

      const epoch = transitionRef.current.epoch + 1;
      transitionRef.current = {
        current: null,
        epoch,
        origin: "manual",
        pending,
        pendingOrigin: "manual",
        phase: "recovering",
      };
      activeMachineRef.current = machineName;
      activeArtboardRef.current = artboardName;
      releaseRuntimeInputs();
      rive.reset({
        artboard: artboardName,
        stateMachines: machineName,
        autoplay: true,
      });
      pausedRef.current = false;
      setPaused(false);
      setSelectedMachine(machineName);
      setActiveChoice("idle");

      scheduledFrameRef.current = window.requestAnimationFrame(() => {
        scheduledFrameRef.current = null;
        const controller = transitionRef.current;
        if (controller.epoch !== epoch || controller.phase !== "recovering") return;

        readMachineInputs(machineName);
        const queued = controller.pending;
        const queuedOrigin = controller.pendingOrigin;
        controller.pending = null;
        controller.pendingOrigin = "manual";
        controller.phase = "idle";
        if (queued && queued.id !== "idle") {
          scheduleChoiceStart(queued, queuedOrigin);
        }
      });
    },
    [
      clearRandomReturn,
      clearTransitionFrame,
      clearTransitionWatchdog,
      readMachineInputs,
      releaseRuntimeInputs,
      scheduleChoiceStart,
      selectedArtboard,
    ],
  );

  useEffect(() => {
    recoverMachineRef.current = () => {
      const controller = transitionRef.current;
      resetMachineController(activeMachineRef.current, controller.pending);
    };
    return () => {
      recoverMachineRef.current = () => undefined;
    };
  }, [resetMachineController]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    clearTransitionFrame();
    clearTransitionWatchdog();
    clearRandomReturn();
    transitionRef.current = {
      current: null,
      epoch: transitionRef.current.epoch + 1,
      origin: "manual",
      pending: null,
      pendingOrigin: "manual",
      phase: "booting",
    };
    setStatus("loading");
    setErrorMessage("");
    RuntimeLoader.setWasmUrl(riveWasm);
    RuntimeLoader.setWasmFallbackUrl(riveWasmFallback);

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const rive = new Rive({
      src: riveSource,
      canvas,
      artboard: "NotionAI_Rive_Phase02_v09",
      stateMachines: "Main",
      autoplay: !reduceMotion,
      layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
      onLoad: () => {
        if (disposed) return;
        rive.resizeDrawingSurfaceToCanvas();

        const loadedArtboards = (
          (rive.contents as RiveContents | undefined)?.artboards ?? []
        ).map((artboard) => ({
          ...artboard,
          name: cleanName(artboard.name),
          animations: artboard.animations.map(cleanName),
          stateMachines: artboard.stateMachines.map((machine) => ({
            ...machine,
            name: cleanName(machine.name),
            inputs: machine.inputs.map((input) => ({
              ...input,
              name: cleanName(input.name),
            })),
          })),
        }));
        const activeArtboard =
          loadedArtboards.find(
            (artboard) => artboard.name === cleanName(rive.activeArtboard),
          ) ?? loadedArtboards[0];
        const machine =
          activeArtboard?.stateMachines.find(({ name }) => name === "Main") ??
          activeArtboard?.stateMachines[0];

        setArtboards(loadedArtboards);
        setSelectedArtboard(activeArtboard?.name ?? "");
        setSelectedMachine(machine?.name ?? "");
        activeMachineRef.current = machine?.name ?? "";
        activeArtboardRef.current = activeArtboard?.name ?? "";
        transitionRef.current = {
          current: null,
          epoch: transitionRef.current.epoch,
          origin: "manual",
          pending: null,
          pendingOrigin: "manual",
          phase: "idle",
        };
        setActiveChoice("idle");
        pausedRef.current = reduceMotion;
        setPaused(reduceMotion);
        setStatus("ready");
        if (machine) readMachineInputs(machine.name);
      },
      onLoadError: (event) => {
        if (disposed) return;
        setStatus("error");
        setErrorMessage(
          typeof event.data === "string"
            ? event.data
            : "The Rive runtime could not open this asset.",
        );
      },
      onPlay: () => {
        if (disposed) return;
        pausedRef.current = false;
        setPaused(false);
        const controller = transitionRef.current;
        if (
          controller.current &&
          ["entering", "exiting", "oneShot"].includes(controller.phase)
        ) {
          armTransitionWatchdog(controller.phase, controller.current.id);
        }
      },
      onPause: () => {
        if (disposed) return;
        pausedRef.current = true;
        clearTransitionWatchdog();
        setPaused(true);
      },
      onStateChange: (event) => {
        if (disposed) return;
        const names = eventNames(event);
        if (names.length) handleStateChanges(names);
      },
    });

    riveRef.current = rive;
    let resizeFrame: number | null = null;
    const observer = new ResizeObserver(() => {
      if (resizeFrame !== null) window.cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(() => {
        rive.resizeDrawingSurfaceToCanvas();
        resizeFrame = null;
      });
    });
    observer.observe(canvas.parentElement ?? canvas);

    return () => {
      disposed = true;
      if (scheduledFrameRef.current !== null) {
        window.cancelAnimationFrame(scheduledFrameRef.current);
      }
      if (resizeFrame !== null) window.cancelAnimationFrame(resizeFrame);
      observer.disconnect();
      clearTransitionFrame();
      clearTransitionWatchdog();
      clearRandomReturn();
      transitionRef.current = {
        current: null,
        epoch: transitionRef.current.epoch + 1,
        origin: "manual",
        pending: null,
        pendingOrigin: "manual",
        phase: "booting",
      };
      releaseRuntimeInputs();
      rive.cleanup();
      riveRef.current = null;
    };
  }, [
    armTransitionWatchdog,
    clearRandomReturn,
    clearTransitionFrame,
    clearTransitionWatchdog,
    handleStateChanges,
    readMachineInputs,
    releaseRuntimeInputs,
    reloadKey,
  ]);

  const restartMachine = (machineName: string, inputName?: string) => {
    const targetChoice = inputName ? choiceFromTrigger(inputName) : undefined;
    resetMachineController(machineName, targetChoice ?? null);
  };

  const triggerState = (
    choice: StateChoice,
    source: "manual" | "random" = "manual",
  ) => requestState(choice, source);

  const updateInput = (input: InputDescriptor, nextValue?: boolean | number) => {
    if (!selectedMachine) return;
    if (input.type === StateMachineInputType.Trigger) {
      const matchingChoice = choiceFromTrigger(input.name);
      if (matchingChoice) {
        requestState(matchingChoice);
        return;
      }

      const exitingChoice = choiceFromOutTrigger(input.name);
      if (exitingChoice?.id === transitionRef.current.current?.id) {
        requestState(idleChoice);
      }
      return;
    }

    fireInput(input.name, selectedMachine, nextValue);
  };

  const togglePlayback = () => {
    const rive = riveRef.current;
    if (!rive || !selectedMachine) return;
    if (paused) {
      pausedRef.current = false;
      setPaused(false);
      rive.play(selectedMachine);
      const controller = transitionRef.current;
      if (
        controller.current &&
        ["entering", "exiting", "oneShot"].includes(controller.phase)
      ) {
        armTransitionWatchdog(controller.phase, controller.current.id);
      }
    } else {
      pausedRef.current = true;
      clearTransitionWatchdog();
      setPaused(true);
      rive.pause(selectedMachine);
    }
  };

  const replay = () => {
    const choice = stateChoices.find(({ id }) => id === activeChoice);
    if (!choice || choice.id === "idle") {
      restartMachine(selectedMachine);
      return;
    }
    requestState(choice, "manual", true);
  };

  const declaredMachineInputs =
    currentArtboard?.stateMachines.find(({ name }) => name === selectedMachine)?.inputs ??
    [];
  const knownInputs = machineInputs.length > 0 ? machineInputs : declaredMachineInputs;
  const availableInputNames = new Set(knownInputs.map(({ name }) => name));
  const activeChoiceLabel =
    stateChoices.find((choice) => choice.id === activeChoice)?.label ?? "Idle";

  const triggerRandomState = () => {
    const availableChoices = stateChoices.filter(
      (choice) =>
        choice.id !== "idle" &&
        choice.outTrigger &&
        availableInputNames.has(choice.trigger) &&
        availableInputNames.has(choice.outTrigger),
    );
    const alternatives = availableChoices.filter(
      (choice) => choice.id !== activeChoice,
    );
    const candidates = alternatives.length ? alternatives : availableChoices;
    const choice = randomChoice(candidates);
    if (!choice) return;
    triggerState(choice, "random");
  };

  if (variant === "assistant") {
    return (
      <div
        className={`${styles.prototype} ${styles.assistantPrototype}`}
        data-frontpage-nosey="true"
        data-entrance={assistantEntranceArmed ? "armed" : "waiting"}
        data-status={status}
        style={
          {
            "--assistant-entrance-delay": `${assistantEntranceDelay}ms`,
          } as CSSProperties
        }
      >
        <div className={`${styles.canvasStage} ${styles.assistantStage}`}>
          <canvas
            ref={canvasRef}
            className={`${styles.canvas} ${styles.assistantCanvas}`}
            aria-hidden="true"
          />

          {status === "ready" ? (
            <>
              <button
                type="button"
                className={styles.assistantButton}
                onClick={(event) => {
                  triggerRandomState();
                  if (event.detail > 0) event.currentTarget.blur();
                }}
                aria-label="Play a Nosey animation"
                aria-describedby="frontpage-nosey-description"
              />
              <span id="frontpage-nosey-description" className="sr-only">
                Interactive character from Your AI Team.
              </span>
              <output className="sr-only" aria-live="polite" aria-atomic="true">
                {activeChoiceLabel}
              </output>
            </>
          ) : null}

          {status === "loading" ? (
            <span className="sr-only" role="status">
              Loading Nosey.
            </span>
          ) : null}

          {status === "error" ? (
            <button
              type="button"
              className={styles.assistantRetry}
              onClick={() => setReloadKey((key) => key + 1)}
              aria-label="Retry loading Nosey"
            >
              <ArrowClockwise size={22} weight="bold" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  if (variant === "playground") {
    return (
      <div className={`${styles.prototype} ${styles.playgroundPrototype}`}>
        <div
          className={`${styles.canvasStage} ${styles.playgroundStage}`}
          data-status={status}
        >
          <canvas
            ref={canvasRef}
            className={`${styles.canvas} ${styles.playgroundCanvas}`}
            role="img"
            aria-label="Nosey AI interactive animated character"
          />

          {status === "ready" ? (
            <>
              <button
                type="button"
                className={styles.randomStateButton}
                onClick={triggerRandomState}
                aria-label="Play a random Nosey state"
                aria-describedby="playground-nosey-state"
              />
              <output
                id="playground-nosey-state"
                className={styles.playgroundStateName}
                aria-live="polite"
                aria-atomic="true"
              >
                {activeChoiceLabel}
              </output>
            </>
          ) : null}

          {status === "loading" ? (
            <div className={styles.playgroundLoading} role="status">
              <span className={styles.loadingFigure} aria-hidden="true" />
              <span className="sr-only">Loading the Nosey AI animation.</span>
            </div>
          ) : null}

          {status === "error" ? (
            <div className={styles.playgroundError} role="alert">
              <WarningCircle size={28} weight="duotone" aria-hidden="true" />
              <span className="sr-only">
                The Nosey AI animation could not load. {errorMessage}
              </span>
              <button
                type="button"
                onClick={() => setReloadKey((key) => key + 1)}
                aria-label="Retry loading the Nosey AI animation"
              >
                <ArrowClockwise size={19} weight="bold" aria-hidden="true" />
              </button>
            </div>
          ) : null}

        </div>
      </div>
    );
  }

  return (
    <article
      className={`project-page ${styles.prototype}`}
      aria-labelledby="project-title"
    >
      <header className="project-heading">
        <a className="project-back" href={`${basePath}/work/`}>
          <span aria-hidden="true">←</span> All work
        </a>
        <h1 id="project-title">Your AI Team</h1>
        <p>Motion case study</p>
      </header>

      <div className="project-modules">
        <div className={styles.workbench}>
          <div className={styles.previewPanel}>
            <div className={styles.canvasStage} data-status={status}>
              <canvas
                ref={canvasRef}
                className={styles.canvas}
                role="img"
                aria-label="Your AI Team animated character"
              />

              {status === "ready" ? (
                <button
                  type="button"
                  className={styles.randomStateButton}
                  onClick={triggerRandomState}
                  aria-label="Play a surprise animation"
                />
              ) : null}

              {status === "loading" ? (
                <div className={styles.loadingState} role="status">
                  <span className={styles.loadingFigure} aria-hidden="true" />
                  <span className={styles.loadingLine} aria-hidden="true" />
                  <p>Preparing Your AI Team</p>
                </div>
              ) : null}

              {status === "error" ? (
                <div className={styles.errorState} role="alert">
                  <WarningCircle size={28} weight="duotone" aria-hidden="true" />
                  <strong>Could not load the animation</strong>
                  <p>{errorMessage}</p>
                  <button type="button" onClick={() => setReloadKey((key) => key + 1)}>
                    Try again
                  </button>
                </div>
              ) : null}
            </div>

            <div className={styles.playbackBar}>
              <button
                type="button"
                className={styles.iconButton}
                onClick={togglePlayback}
                disabled={status !== "ready"}
                aria-label={paused ? "Play animation" : "Pause animation"}
              >
                {paused ? <Play size={18} weight="fill" /> : <Pause size={18} weight="fill" />}
              </button>
              <button
                type="button"
                className={styles.iconButton}
                onClick={replay}
                disabled={status !== "ready"}
                aria-label="Replay current state"
              >
                <ArrowClockwise size={18} weight="bold" />
              </button>
            </div>
          </div>

          <aside className={styles.controlPanel} aria-label="Animation controls">
            <div className={styles.controlHeading}>
              <div>
                <h2>Choose a state</h2>
                <p>Switch directly between the assistant&apos;s authored behaviors.</p>
              </div>
            </div>

            <div className={styles.stateList}>
              {status === "loading" ? (
                <div className={styles.stateSkeleton} aria-hidden="true">
                  {Array.from({ length: 8 }, (_, index) => (
                    <span key={index} />
                  ))}
                </div>
              ) : null}

              {status === "ready" && !selectedMachine ? (
                <div className={styles.emptyState}>
                  <Sparkle size={24} weight="duotone" aria-hidden="true" />
                  <strong>No state machine found</strong>
                  <p>This artboard does not expose interactive states.</p>
                </div>
              ) : null}

              {status === "ready" && selectedMachine
                ? groupedChoices.map(({ group, choices }) => {
                    const details = groupDetails[group];
                    const GroupIcon = details.icon;
                    return (
                      <section className={styles.stateGroup} key={group}>
                        <h3>
                          <GroupIcon size={16} weight="duotone" aria-hidden="true" />
                          {details.label}
                        </h3>
                        <div className={styles.stateGrid}>
                          {choices.map((choice) => {
                            const isActive = activeChoice === choice.id;
                            const available = availableInputNames.has(choice.trigger);
                            return (
                              <button
                                type="button"
                                key={choice.id}
                                className={styles.stateButton}
                                data-active={isActive}
                                aria-pressed={isActive}
                                disabled={!available}
                                onClick={() => triggerState(choice)}
                              >
                                <span>{choice.label}</span>
                                <Play size={14} weight="fill" aria-hidden="true" />
                              </button>
                            );
                          })}
                        </div>
                      </section>
                    );
                  })
                : null}
            </div>

            {currentArtboard?.stateMachines.length ? (
              <details className={styles.machinePanel}>
                <summary>
                  <span>
                    <SlidersHorizontal size={18} weight="duotone" aria-hidden="true" />
                    All Rive triggers
                  </span>
                  <CaretDown size={15} weight="bold" aria-hidden="true" />
                </summary>
                <div className={styles.machineBody}>
                  {currentArtboard.stateMachines.length > 1 ? (
                    <label className={styles.machineSelect}>
                      <span>State machine</span>
                      <select
                        value={selectedMachine}
                        onChange={(event) => restartMachine(event.target.value)}
                      >
                        {currentArtboard.stateMachines.map((machine) => (
                          <option value={machine.name} key={machine.name}>
                            {stateLabel(machine.name)}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}

                  <button
                    type="button"
                    className={styles.machineStart}
                    onClick={() => restartMachine(selectedMachine)}
                  >
                    <Play size={15} weight="fill" aria-hidden="true" />
                    Restart machine
                  </button>

                  <div className={styles.inputList}>
                    {machineInputs.length ? (
                      machineInputs.map((input) => (
                        <div className={styles.inputRow} key={input.name}>
                          <span>
                            <strong>{stateLabel(input.name)}</strong>
                            <small>{inputTypeLabel(input.type)}</small>
                          </span>
                          {input.type === StateMachineInputType.Trigger ? (
                            <button
                              type="button"
                              aria-label={`Fire ${stateLabel(input.name)}`}
                              onClick={() => updateInput(input)}
                            >
                              Fire
                            </button>
                          ) : null}
                          {input.type === StateMachineInputType.Boolean ? (
                            <button
                              type="button"
                              aria-pressed={Boolean(input.value)}
                              aria-label={`${stateLabel(input.name)}: ${input.value ? "turn off" : "turn on"}`}
                              onClick={() => updateInput(input, !input.value)}
                            >
                              {input.value ? "On" : "Off"}
                            </button>
                          ) : null}
                          {input.type === StateMachineInputType.Number ? (
                            <input
                              type="number"
                              aria-label={`${stateLabel(input.name)} value`}
                              value={Number(input.value ?? 0)}
                              onChange={(event) =>
                                updateInput(input, event.target.valueAsNumber || 0)
                              }
                            />
                          ) : null}
                        </div>
                      ))
                    ) : (
                      <p className={styles.noInputs}>This machine has no exposed inputs.</p>
                    )}
                  </div>
                </div>
              </details>
            ) : null}
          </aside>
        </div>
      </div>

      <section
        className={styles.caseStudy}
        aria-labelledby="campaign-story-title"
      >
        <header className={styles.storyLead}>
          <h2 id="campaign-story-title">Making AI feel like a team</h2>
          <p>
            The campaign needed to make Notion&apos;s AI tools practical and easy
            to understand. Instead of another feature list, each product became
            a teammate with a clear job.
          </p>
        </header>

        <dl className={styles.storyFacts}>
          <div>
            <dt>Campaign idea</dt>
            <dd>Meet your AI team</dd>
          </div>
          <div>
            <dt>Concept testing</dt>
            <dd>Individual contributors and executives</dd>
          </div>
          <div>
            <dt>Designed for</dt>
            <dd>OOH, video, digital, and events</dd>
          </div>
        </dl>

        <div className={styles.storyBody}>
          <section
            className={styles.storySection}
            aria-labelledby="from-features-to-teammates"
          >
            <h3 id="from-features-to-teammates">From features to teammates</h3>
            <div className={styles.storySectionBody}>
              <p>
                By 2025, teams were adding separate AI tools for writing,
                meetings, and search. The strategy described the cost of that
                fragmentation in practical terms: more tabs, more vendors, and
                tools that did not share company context. The campaign framed
                Notion as a connected workspace where those jobs could happen
                alongside the knowledge and projects they depended on.
              </p>
              <p>
                The umbrella idea also had to flex. AI Meeting Notes could lead
                with a familiar meeting problem for startups and small
                businesses. Enterprise Search could lead with finding answers
                for larger organizations. Both needed a clear relationship to
                the wider Notion AI story.
              </p>
            </div>
          </section>

          <section
            className={styles.storySection}
            aria-labelledby="choosing-the-team"
          >
            <h3 id="choosing-the-team">Choosing the team</h3>
            <div className={styles.storySectionBody}>
              <p>
                Creative explorations covered four territories: Best Team, Best
                Tools, Busywork, and x3. The group chose Best Team because it
                felt friendly, used the familiar Notion face language, and
                could expand as more products launched.
              </p>
              <p>
                Your AI Team puts a human Notion avatar at the center,
                surrounded by specialized Nosey teammates they direct. The
                point was to show AI as support for people, not a replacement
                for them.
              </p>
            </div>
          </section>

          <blockquote className={styles.storyPrinciple}>
            <p>
              Put the human at the center, with AI help as an extension of the
              human.
            </p>
          </blockquote>

          <section
            className={styles.storySection}
            aria-labelledby="names-that-worked"
          >
            <h3 id="names-that-worked">Names that worked at a glance</h3>
            <div className={styles.storySectionBody}>
              <p>
                Concept testing with individual contributors and executives
                favored Meet your AI team among the headline options.
                Notetaker was the clearest role, and more literal,
                task-focused names improved clarity. The color-coded team was
                also described as memorable and approachable.
              </p>
              <p>
                The official product names stayed in place. These roles were
                the first explanation, not new product names.
              </p>

              <dl className={styles.roleList}>
                <div>
                  <dt>Notetaker</dt>
                  <dd>Takes perfect notes</dd>
                </div>
                <div>
                  <dt>Editor</dt>
                  <dd>Drafts docs in minutes</dd>
                </div>
                <div>
                  <dt>Researcher</dt>
                  <dd>Searches every app</dd>
                </div>
                <div>
                  <dt>Builder</dt>
                  <dd>Builds custom workflows</dd>
                </div>
              </dl>
            </div>
          </section>

          <section
            className={styles.storySection}
            aria-labelledby="motion-built-around-roles"
          >
            <h3 id="motion-built-around-roles">Motion built around roles</h3>
            <div className={styles.storySectionBody}>
              <p>
                The interactive prototype above follows the same system. Nosey
                can think, search, research, write, build, or record, while
                glasses, gear, and hats give each role a quick visual read. The
                face remains consistent, so a new behavior still belongs to
                the same cast.
              </p>
              <p>
                Several characters could read as a team in umbrella work. A
                product-led piece could focus on one teammate and one pain
                point. The motion language stayed recognizable in either
                format.
              </p>
            </div>
          </section>

          <section
            className={styles.storySection}
            aria-labelledby="designed-for-more-than-one-frame"
          >
            <h3 id="designed-for-more-than-one-frame">
              Designed for more than one frame
            </h3>
            <div className={styles.storySectionBody}>
              <p>
                The system was conceived for airport and transit OOH, digital
                video, web, social and performance ads, direct mail, and events.
                In physical sequences such as triptychs or wild postings,
                repetition could introduce several teammates. In video, the
                umbrella idea and one product job could live in the same piece.
              </p>
              <p>
                The product names remained AI Meeting Notes and Enterprise
                Search. The creative role names gave each one a faster first
                explanation and left room for future teammates, including the
                idea of building your own.
              </p>
            </div>
          </section>
        </div>
      </section>
    </article>
  );
}
