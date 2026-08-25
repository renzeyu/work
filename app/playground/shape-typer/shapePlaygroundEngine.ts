import Matter from "matter-js";
import {
  createPlaygroundColorCycle,
  createPlaygroundSpawnSpec,
  PLAYGROUND_FIXED_STEP_MS,
  PLAYGROUND_MAX_CATCH_UP_STEPS,
  PLAYGROUND_MAX_FRAME_DELTA_MS,
  PLAYGROUND_PHYSICS,
  playgroundBodyLimit,
  playgroundCollider,
  playgroundGlyphInkSize,
  playgroundShortSide,
} from "./shapePlaygroundConfig.mjs";

type ShapeVisual = {
  colliderOffsetX: number;
  colliderOffsetY: number;
  color: string;
  fontSize: number;
  fontSizeRatio: number;
  glyph: string;
};

type PlaygroundEngineOptions = {
  canvas: HTMLCanvasElement;
  onCountChange: (count: number) => void;
};

type ShapeMetrics = {
  height: number;
  offset: { x: number; y: number };
  width: number;
};

type PlaygroundCollider = {
  kind: "vertices";
  vertices: Matter.Vector[];
};

const WALL_THICKNESS = 80;

function createBody(
  spec: ReturnType<typeof createPlaygroundSpawnSpec>,
  collider: PlaygroundCollider,
) {
  const options: Matter.IChamferableBodyDefinition = {
    density: spec.density,
    friction: PLAYGROUND_PHYSICS.friction,
    frictionAir: PLAYGROUND_PHYSICS.frictionAir,
    frictionStatic: PLAYGROUND_PHYSICS.frictionStatic,
    restitution: spec.restitution,
    sleepThreshold: 50,
    label: "playground-shape",
  };
  const body = Matter.Bodies.fromVertices(
    spec.x,
    spec.y,
    [collider.vertices],
    options,
    true,
  );
  const colliderOffset = {
    x: (body.bounds.min.x + body.bounds.max.x) / 2 - body.position.x,
    y: (body.bounds.min.y + body.bounds.max.y) / 2 - body.position.y,
  };

  Matter.Body.setAngle(body, spec.angle);
  Matter.Body.setAngularVelocity(body, spec.angularVelocity);
  Matter.Body.setVelocity(body, {
    x: spec.horizontalVelocity,
    y: 0,
  });
  return { body, colliderOffset };
}

function createWalls(width: number, height: number) {
  const options: Matter.IChamferableBodyDefinition = {
    isStatic: true,
    friction: 0.9,
    frictionStatic: 1,
    restitution: 0.12,
    label: "playground-wall",
  };
  const halfWall = WALL_THICKNESS / 2;

  return [
    Matter.Bodies.rectangle(
      width / 2,
      -halfWall,
      width + WALL_THICKNESS * 2,
      WALL_THICKNESS,
      options,
    ),
    Matter.Bodies.rectangle(
      width / 2,
      height + halfWall,
      width + WALL_THICKNESS * 2,
      WALL_THICKNESS,
      options,
    ),
    Matter.Bodies.rectangle(
      -halfWall,
      height / 2,
      WALL_THICKNESS,
      height + WALL_THICKNESS * 2,
      options,
    ),
    Matter.Bodies.rectangle(
      width + halfWall,
      height / 2,
      WALL_THICKNESS,
      height + WALL_THICKNESS * 2,
      options,
    ),
  ];
}

function clampBody(body: Matter.Body, width: number, height: number) {
  const halfWidth = Math.max(
    (body.bounds.max.x - body.bounds.min.x) / 2,
    1,
  );
  const halfHeight = Math.max(
    (body.bounds.max.y - body.bounds.min.y) / 2,
    1,
  );
  Matter.Body.setPosition(body, {
    x: Math.min(Math.max(body.position.x, halfWidth), Math.max(halfWidth, width - halfWidth)),
    y: Math.min(Math.max(body.position.y, halfHeight), Math.max(halfHeight, height - halfHeight)),
  });
}

export function createShapePlaygroundEngine({
  canvas,
  onCountChange,
}: PlaygroundEngineOptions) {
  const drawingContext = canvas.getContext("2d");
  if (!drawingContext) throw new Error("Canvas rendering is unavailable");
  const context: CanvasRenderingContext2D = drawingContext;

  const engine = Matter.Engine.create({ enableSleeping: true });
  engine.gravity.x = 0;
  engine.gravity.y = 1;
  engine.gravity.scale = 0.001;

  const bodies: Matter.Body[] = [];
  const colorCycle = createPlaygroundColorCycle();
  const visuals = new Map<number, ShapeVisual>();
  const shapeMetrics = new Map<string, ShapeMetrics>();
  let walls: Matter.Body[] = [];
  let width = 1;
  let height = 1;
  let pixelRatio = 1;
  let isEligible = false;
  let animationFrame = 0;
  let lastFrameTime = 0;
  let accumulator = 0;
  let disposed = false;

  function measureVisual(visual: ShapeVisual) {
    const key = `${visual.glyph}:${visual.fontSize.toFixed(2)}`;
    const cached = shapeMetrics.get(key);
    if (cached) return cached;

    context.font = `400 ${visual.fontSize}px "Shape Glyphs"`;
    const metrics = context.measureText(visual.glyph);
    const inkWidth =
      metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight;
    const inkHeight =
      metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
    const fallbackSize = playgroundGlyphInkSize(
      visual.glyph,
      visual.fontSize,
    );
    const measured = {
      width:
        Number.isFinite(inkWidth) && inkWidth > 0
          ? inkWidth
          : Math.max(metrics.width, fallbackSize.width),
      height:
        Number.isFinite(inkHeight) && inkHeight > 0
          ? inkHeight
          : fallbackSize.height,
      offset: {
        x: (metrics.actualBoundingBoxLeft - metrics.actualBoundingBoxRight) / 2,
        y:
          (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2,
      },
    };
    shapeMetrics.set(key, measured);
    return measured;
  }

  function draw() {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.textAlign = "left";
    context.textBaseline = "alphabetic";

    for (const body of bodies) {
      const visual = visuals.get(body.id);
      if (!visual) continue;
      const metrics = measureVisual(visual);

      context.save();
      context.translate(body.position.x, body.position.y);
      context.rotate(body.angle);
      context.fillStyle = visual.color;
      context.font = `400 ${visual.fontSize}px "Shape Glyphs"`;
      context.fillText(
        visual.glyph,
        metrics.offset.x + visual.colliderOffsetX,
        metrics.offset.y + visual.colliderOffsetY,
      );
      context.restore();
    }
  }

  function stopLoop() {
    window.cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    accumulator = 0;
  }

  function scheduleLoop() {
    if (
      disposed ||
      animationFrame !== 0 ||
      !isEligible ||
      bodies.length === 0
    ) {
      return;
    }
    lastFrameTime = window.performance.now();
    animationFrame = window.requestAnimationFrame(step);
  }

  function step(time: number) {
    animationFrame = 0;
    if (disposed || !isEligible || bodies.length === 0) return;

    accumulator += Math.min(
      Math.max(time - lastFrameTime, 0),
      PLAYGROUND_MAX_FRAME_DELTA_MS,
    );
    lastFrameTime = time;
    let updates = 0;
    while (
      accumulator >= PLAYGROUND_FIXED_STEP_MS &&
      updates < PLAYGROUND_MAX_CATCH_UP_STEPS
    ) {
      Matter.Engine.update(engine, PLAYGROUND_FIXED_STEP_MS);
      accumulator -= PLAYGROUND_FIXED_STEP_MS;
      updates += 1;
    }
    if (updates === PLAYGROUND_MAX_CATCH_UP_STEPS) accumulator = 0;

    draw();
    if (bodies.every((body) => body.isSleeping)) return;
    animationFrame = window.requestAnimationFrame(step);
  }

  function trimToLimit(limit: number) {
    while (bodies.length > limit) {
      const oldestBody = bodies.shift();
      if (!oldestBody) break;
      Matter.Composite.remove(engine.world, oldestBody);
      visuals.delete(oldestBody.id);
    }
    onCountChange(bodies.length);
  }

  return {
    spawn(
      x: number,
      y: number,
      requestedBodyLimit = playgroundBodyLimit(),
    ) {
      if (disposed || width <= 1 || height <= 1) return null;
      const spec = createPlaygroundSpawnSpec({
        color: colorCycle.next(),
        x,
        y,
        width,
        height,
      });
      const visual = {
        colliderOffsetX: 0,
        colliderOffsetY: 0,
        color: spec.color,
        fontSize: spec.fontSize,
        fontSizeRatio: spec.fontSize / playgroundShortSide(width, height),
        glyph: spec.glyph,
      };
      const metrics = measureVisual(visual);
      const { body, colliderOffset } = createBody(
        spec,
        playgroundCollider(
          spec.glyph,
          metrics.width,
          metrics.height,
        ) as PlaygroundCollider,
      );
      visual.colliderOffsetX = colliderOffset.x;
      visual.colliderOffsetY = colliderOffset.y;
      clampBody(body, width, height);
      bodies.push(body);
      visuals.set(body.id, visual);
      Matter.Composite.add(engine.world, body);
      trimToLimit(playgroundBodyLimit(requestedBodyLimit));
      draw();
      scheduleLoop();
      return { count: bodies.length, glyph: spec.glyph };
    },

    reset() {
      stopLoop();
      for (const body of bodies) {
        Matter.Composite.remove(engine.world, body);
      }
      bodies.length = 0;
      visuals.clear();
      colorCycle.reset();
      onCountChange(0);
      draw();
    },

    trimToBodyLimit(requestedBodyLimit: number) {
      if (disposed) return bodies.length;
      trimToLimit(playgroundBodyLimit(requestedBodyLimit));
      draw();
      return bodies.length;
    },

    resize(nextWidth: number, nextHeight: number, nextPixelRatio: number) {
      if (disposed || nextWidth <= 1 || nextHeight <= 1) return;
      const previousWidth = width;
      const previousHeight = height;
      const positionScaleX = previousWidth > 1 ? nextWidth / previousWidth : 1;
      const positionScaleY = previousHeight > 1 ? nextHeight / previousHeight : 1;
      const nextShortSide = playgroundShortSide(nextWidth, nextHeight);
      width = nextWidth;
      height = nextHeight;
      pixelRatio = Math.min(Math.max(nextPixelRatio, 1), 2);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);

      Matter.Composite.remove(engine.world, walls);
      walls = createWalls(width, height);
      Matter.Composite.add(engine.world, walls);
      for (const body of bodies) {
        const visual = visuals.get(body.id);
        if (visual) {
          const nextFontSize = visual.fontSizeRatio * nextShortSide;
          const bodyScale = nextFontSize / visual.fontSize;
          if (Number.isFinite(bodyScale) && Math.abs(bodyScale - 1) > 0.001) {
            Matter.Body.scale(body, bodyScale, bodyScale);
            visual.colliderOffsetX *= bodyScale;
            visual.colliderOffsetY *= bodyScale;
            visual.fontSize = nextFontSize;
          }
        }
        Matter.Body.setPosition(body, {
          x: body.position.x * positionScaleX,
          y: body.position.y * positionScaleY,
        });
        Matter.Sleeping.set(body, false);
        clampBody(body, width, height);
      }
      trimToLimit(playgroundBodyLimit());
      shapeMetrics.clear();
      draw();
      scheduleLoop();
    },

    setEligible(nextEligible: boolean) {
      isEligible = nextEligible;
      if (isEligible) {
        scheduleLoop();
      } else {
        stopLoop();
      }
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      stopLoop();
      Matter.Composite.clear(engine.world, false, true);
      Matter.Engine.clear(engine);
      bodies.length = 0;
      visuals.clear();
      shapeMetrics.clear();
    },
  };
}
