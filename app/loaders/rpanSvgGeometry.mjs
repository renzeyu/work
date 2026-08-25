const COMMAND_OR_NUMBER =
  /[A-Za-z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g;

/** @typedef {[number, number]} Point */

/**
 * @typedef {{
 *   start: Point;
 *   c1: Point;
 *   c2: Point;
 *   end: Point;
 * }} CubicSegment
 */

/**
 * @typedef {{
 *   start: Point;
 *   segments: CubicSegment[];
 * }} CubicContour
 */

function point(x, y) {
  return /** @type {Point} */ ([x, y]);
}

function samePoint(a, b) {
  return Math.abs(a[0] - b[0]) < 1e-10 && Math.abs(a[1] - b[1]) < 1e-10;
}

function lerpPoint(a, b, progress) {
  return point(
    a[0] + (b[0] - a[0]) * progress,
    a[1] + (b[1] - a[1]) * progress,
  );
}

function lineSegment(start, end) {
  return {
    start: point(...start),
    c1: lerpPoint(start, end, 1 / 3),
    c2: lerpPoint(start, end, 2 / 3),
    end: point(...end),
  };
}

function cloneSegment(segment) {
  return {
    start: point(...segment.start),
    c1: point(...segment.c1),
    c2: point(...segment.c2),
    end: point(...segment.end),
  };
}

function cloneContour(contour) {
  return {
    start: point(...contour.start),
    segments: contour.segments.map(cloneSegment),
  };
}

function extractSource(markup) {
  const svgTag = markup.match(/<svg\b[^>]*>/i)?.[0];
  const pathTag = markup.match(/<path\b[^>]*\bid="path2"[^>]*>/i)?.[0];

  if (!svgTag || !pathTag) {
    throw new Error("The supplied RPAN SVG must contain its original svg and path2 elements");
  }

  const viewBoxText = svgTag.match(/\bviewBox="([^"]+)"/i)?.[1];
  const pathData = pathTag.match(/\bd="([^"]+)"/is)?.[1];
  const style = pathTag.match(/\bstyle="([^"]+)"/i)?.[1] ?? "";
  const fill = style.match(/(?:^|;)\s*fill\s*:\s*([^;]+)/i)?.[1]?.trim();

  if (!viewBoxText || !pathData || !fill) {
    throw new Error("The supplied RPAN SVG is missing its viewBox, fill, or path data");
  }

  const viewBox = viewBoxText.trim().split(/[\s,]+/).map(Number);
  if (viewBox.length !== 4 || !viewBox.every(Number.isFinite)) {
    throw new Error("The supplied RPAN SVG has an invalid viewBox");
  }

  return { fill, pathData, viewBox };
}

/**
 * Convert the source path into closed, absolute cubic contours. Straight
 * segments become mathematically identical collinear cubics. No sampling or
 * outline approximation occurs here.
 *
 * @param {string} pathData
 * @returns {CubicContour[]}
 */
function parseToCubics(pathData) {
  const tokens = pathData.match(COMMAND_OR_NUMBER) ?? [];
  /** @type {CubicContour[]} */
  const contours = [];
  /** @type {CubicContour | null} */
  let contour = null;
  /** @type {Point | null} */
  let previousC2 = null;
  let command = "";
  let cursor = 0;
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;

  const nextNumber = () => {
    const value = Number(tokens[cursor]);
    cursor += 1;
    if (!Number.isFinite(value)) throw new Error("Invalid RPAN SVG path number");
    return value;
  };

  const appendLine = (endX, endY) => {
    if (!contour) throw new Error("RPAN SVG path begins before a move command");
    const segment = lineSegment(point(x, y), point(endX, endY));
    contour.segments.push(segment);
    x = endX;
    y = endY;
    previousC2 = null;
  };

  while (cursor < tokens.length) {
    if (/^[A-Za-z]$/.test(tokens[cursor])) {
      command = tokens[cursor];
      cursor += 1;
    }

    if (!command) throw new Error("RPAN SVG path contains an orphaned number");
    const relative = command === command.toLowerCase();
    const upper = command.toUpperCase();

    if (upper === "M") {
      const moveX = nextNumber() + (relative ? x : 0);
      const moveY = nextNumber() + (relative ? y : 0);
      x = moveX;
      y = moveY;
      startX = x;
      startY = y;
      contour = { start: point(x, y), segments: [] };
      contours.push(contour);
      previousC2 = null;
      command = relative ? "l" : "L";
      continue;
    }

    if (upper === "Z") {
      if (!contour) throw new Error("RPAN SVG closes a missing contour");
      if (!samePoint(point(x, y), point(startX, startY))) {
        appendLine(startX, startY);
      }
      x = startX;
      y = startY;
      previousC2 = null;
      command = "";
      continue;
    }

    if (upper === "L") {
      const endX = nextNumber() + (relative ? x : 0);
      const endY = nextNumber() + (relative ? y : 0);
      appendLine(endX, endY);
      continue;
    }

    if (upper === "H") {
      appendLine(nextNumber() + (relative ? x : 0), y);
      continue;
    }

    if (upper === "V") {
      appendLine(x, nextNumber() + (relative ? y : 0));
      continue;
    }

    if (upper === "C") {
      if (!contour) throw new Error("RPAN SVG curve begins before a move command");
      const baseX = x;
      const baseY = y;
      const c1 = point(
        nextNumber() + (relative ? baseX : 0),
        nextNumber() + (relative ? baseY : 0),
      );
      const c2 = point(
        nextNumber() + (relative ? baseX : 0),
        nextNumber() + (relative ? baseY : 0),
      );
      const end = point(
        nextNumber() + (relative ? baseX : 0),
        nextNumber() + (relative ? baseY : 0),
      );
      contour.segments.push({ start: point(x, y), c1, c2, end });
      x = end[0];
      y = end[1];
      previousC2 = c2;
      continue;
    }

    if (upper === "S") {
      if (!contour) throw new Error("RPAN SVG curve begins before a move command");
      const baseX = x;
      const baseY = y;
      const c1 = previousC2
        ? point(2 * x - previousC2[0], 2 * y - previousC2[1])
        : point(x, y);
      const c2 = point(
        nextNumber() + (relative ? baseX : 0),
        nextNumber() + (relative ? baseY : 0),
      );
      const end = point(
        nextNumber() + (relative ? baseX : 0),
        nextNumber() + (relative ? baseY : 0),
      );
      contour.segments.push({ start: point(x, y), c1, c2, end });
      x = end[0];
      y = end[1];
      previousC2 = c2;
      continue;
    }

    throw new Error(`Unsupported command in supplied RPAN SVG: ${command}`);
  }

  return contours;
}

function translateContour(contour, deltaX, deltaY = 0) {
  const move = ([px, py]) => point(px + deltaX, py + deltaY);
  return {
    start: move(contour.start),
    segments: contour.segments.map((segment) => ({
      start: move(segment.start),
      c1: move(segment.c1),
      c2: move(segment.c2),
      end: move(segment.end),
    })),
  };
}

function rotateContour(contour, firstSegment) {
  const segments = [
    ...contour.segments.slice(firstSegment),
    ...contour.segments.slice(0, firstSegment),
  ].map(cloneSegment);
  return { start: point(...segments[0].start), segments };
}

function splitCubic(segment, progress) {
  const p01 = lerpPoint(segment.start, segment.c1, progress);
  const p12 = lerpPoint(segment.c1, segment.c2, progress);
  const p23 = lerpPoint(segment.c2, segment.end, progress);
  const p012 = lerpPoint(p01, p12, progress);
  const p123 = lerpPoint(p12, p23, progress);
  const midpoint = lerpPoint(p012, p123, progress);
  return [
    { start: point(...segment.start), c1: p01, c2: p012, end: midpoint },
    { start: midpoint, c1: p123, c2: p23, end: point(...segment.end) },
  ];
}

function splitCubicEvenly(segment, pieces) {
  /** @type {CubicSegment[]} */
  const result = [];
  let remainder = cloneSegment(segment);
  for (let pieceIndex = pieces; pieceIndex > 1; pieceIndex -= 1) {
    const [head, tail] = splitCubic(remainder, 1 / pieceIndex);
    result.push(head);
    remainder = tail;
  }
  result.push(remainder);
  return result;
}

function splitContourSegment(contour, segmentIndex, pieces = 2) {
  const copy = cloneContour(contour);
  copy.segments.splice(
    segmentIndex,
    1,
    ...splitCubicEvenly(copy.segments[segmentIndex], pieces),
  );
  return copy;
}

function formatNumber(value) {
  if (Object.is(value, -0) || Math.abs(value) < 1e-12) return "0";
  return Number(value.toPrecision(15)).toString();
}

function serializeContours(contours) {
  return contours
    .map((contour) => {
      const commands = [
        `M${formatNumber(contour.start[0])} ${formatNumber(contour.start[1])}`,
      ];
      for (const segment of contour.segments) {
        commands.push(
          `C${formatNumber(segment.c1[0])} ${formatNumber(segment.c1[1])} ${formatNumber(segment.c2[0])} ${formatNumber(segment.c2[1])} ${formatNumber(segment.end[0])} ${formatNumber(segment.end[1])}`,
        );
      }
      commands.push("Z");
      return commands.join("");
    })
    .join("");
}

function contourBounds(contours) {
  const values = contours.flatMap((contour) => [
    contour.start,
    ...contour.segments.flatMap((segment) => [
      segment.start,
      segment.c1,
      segment.c2,
      segment.end,
    ]),
  ]);
  const xs = values.map(([x]) => x);
  const ys = values.map(([, y]) => y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return {
    x,
    y,
    width: Math.max(...xs) - x,
    height: Math.max(...ys) - y,
  };
}

function deriveRBody(rOuter) {
  const outerBowlEnd = rOuter.segments[12].end;
  const innerBowlStart = rOuter.segments[18].end;
  const segments = [
    ...rOuter.segments.slice(0, 13).map(cloneSegment),
    lineSegment(outerBowlEnd, innerBowlStart),
    cloneSegment(rOuter.segments[19]),
  ];
  return { start: point(...rOuter.start), segments };
}

function deriveRTrimRegion(rOuter) {
  const outerBowlEnd = rOuter.segments[12].end;
  const segments = [
    ...rOuter.segments.slice(13, 19).map(cloneSegment),
    lineSegment(rOuter.segments[18].end, outerBowlEnd),
  ];
  return { start: point(...outerBowlEnd), segments };
}

function deriveRTrimSeam(rOuter) {
  const outerBowlEnd = rOuter.segments[12].end;
  const innerBowlStart = rOuter.segments[18].end;

  // The weld remains entirely inside the source R. It only closes the
  // antialiasing seam between the two source-derived fills.
  return {
    path: `M${formatNumber(innerBowlStart[0])} ${formatNumber(innerBowlStart[1])}L${formatNumber(outerBowlEnd[0])} ${formatNumber(outerBowlEnd[1])}`,
    strokeWidth: 2.4,
  };
}

function deriveRTrimMask(rOuter) {
  const outerBowlEnd = rOuter.segments[12].end;
  const trimOuterStart = rOuter.segments[13].end;
  const trimInnerEnd = rOuter.segments[17].end;
  const innerBowlStart = rOuter.segments[18].end;
  const midpoint = (a, b) => point((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
  const baseCenter = midpoint(outerBowlEnd, innerBowlStart);
  const capCenter = midpoint(trimOuterStart, trimInnerEnd);
  const axisX = capCenter[0] - baseCenter[0];
  const axisY = capCenter[1] - baseCenter[1];
  const axisLength = Math.hypot(axisX, axisY);
  const unitX = axisX / axisLength;
  const unitY = axisY / axisLength;
  const trimPoints = rOuter.segments
    .slice(13, 19)
    .flatMap((segment) => [segment.start, segment.c1, segment.c2, segment.end]);
  const minimumProjection = Math.min(
    ...trimPoints.map(
      ([x, y]) =>
        (x - baseCenter[0]) * unitX + (y - baseCenter[1]) * unitY,
    ),
  );
  const maskPadding = 3;
  const radius =
    Math.hypot(
      trimOuterStart[0] - trimInnerEnd[0],
      trimOuterStart[1] - trimInnerEnd[1],
    ) /
      2 +
    maskPadding;
  const startProjection = minimumProjection - radius - 1;
  const start = point(
    baseCenter[0] + unitX * startProjection,
    baseCenter[1] + unitY * startProjection,
  );
  const length = Math.hypot(
    capCenter[0] - start[0],
    capCenter[1] - start[1],
  );
  const segmentX = capCenter[0] - start[0];
  const segmentY = capCenter[1] - start[1];
  const segmentLengthSquared = segmentX ** 2 + segmentY ** 2;
  const maximumDistance = Math.max(
    ...trimPoints.map(([x, y]) => {
      const progress = Math.min(
        1,
        Math.max(
          0,
          ((x - start[0]) * segmentX + (y - start[1]) * segmentY) /
            segmentLengthSquared,
        ),
      );
      return Math.hypot(
        x - (start[0] + segmentX * progress),
        y - (start[1] + segmentY * progress),
      );
    }),
  );

  if (maximumDistance > radius) {
    throw new Error("The source-derived RPAN R trim mask cannot cover its leg");
  }

  return {
    path: `M${formatNumber(start[0])} ${formatNumber(start[1])}L${formatNumber(capCenter[0])} ${formatNumber(capCenter[1])}`,
    length,
    strokeWidth: radius * 2,
    bounds: {
      x: Math.min(start[0], capCenter[0]) - radius,
      y: Math.min(start[1], capCenter[1]) - radius,
      width: Math.abs(capCenter[0] - start[0]) + radius * 2,
      height: Math.abs(capCenter[1] - start[1]) + radius * 2,
    },
  };
}

function deriveAArch(aOuter, aCounter) {
  const leftInnerBottom = aOuter.segments[7].end;
  const rightInnerTop = aCounter.segments[4].end;
  const segments = [
    cloneSegment(aCounter.segments[0]),
    cloneSegment(aCounter.segments[1]),
    lineSegment(aCounter.segments[1].end, leftInnerBottom),
    ...aOuter.segments.slice(8).map(cloneSegment),
    ...aOuter.segments.slice(0, 5).map(cloneSegment),
    lineSegment(aOuter.segments[4].end, rightInnerTop),
    cloneSegment(aCounter.segments[5]),
    cloneSegment(aCounter.segments[6]),
  ];
  return { start: point(...aCounter.start), segments };
}

function compatibleRToP(rOuter, rCounter, pOuter, pCounter, pOffsetX) {
  const rBody = deriveRBody(rOuter);
  const pOuterAtStem = translateContour(rotateContour(pOuter, 6), pOffsetX);
  const pCounterAtTopLeft = translateContour(rotateContour(pCounter, 2), pOffsetX);
  const pOuterWithMatchingBowl = splitContourSegment(pOuterAtStem, 13, 2);

  if (
    rBody.segments.length !== pOuterWithMatchingBowl.segments.length ||
    rCounter.segments.length !== pCounterAtTopLeft.segments.length
  ) {
    throw new Error("The supplied RPAN R/P contours cannot be paired exactly");
  }

  return {
    from: serializeContours([rBody, rCounter]),
    to: serializeContours([pOuterWithMatchingBowl, pCounterAtTopLeft]),
    signature: [rBody.segments.length, rCounter.segments.length],
  };
}

function compatibleAToN(aOuter, aCounter, nOuter, nOffsetX) {
  const aArch = deriveAArch(aOuter, aCounter);
  let nArch = translateContour(nOuter, nOffsetX);
  nArch = splitContourSegment(nArch, 11, 2);
  nArch = splitContourSegment(nArch, 8, 2);

  if (aArch.segments.length !== nArch.segments.length) {
    throw new Error("The supplied RPAN A/N contours cannot be paired exactly");
  }

  return {
    from: serializeContours([aArch]),
    to: serializeContours([nArch]),
    signature: [aArch.segments.length],
  };
}

/**
 * Build every RPAN outline synchronously from the supplied SVG file. The SVG
 * is the sole contour source. New vertices are created only by exact cubic
 * subdivision or by joining source-authored bar/leg landmarks.
 *
 * @param {string} markup
 */
export function buildRpanSvgGeometry(markup) {
  const source = extractSource(markup);
  const contours = parseToCubics(source.pathData);
  const contourSignature = contours.map((contour) => contour.segments.length);
  const expectedSignature = [20, 7, 14, 7, 19, 7, 20];

  if (contourSignature.join(",") !== expectedSignature.join(",")) {
    throw new Error(
      `Unexpected supplied RPAN contour signature: ${contourSignature.join(",")}`,
    );
  }

  const [rOuter, rCounter, pOuter, pCounter, aOuter, aCounter, nOuter] =
    contours;
  const glyphContours = {
    r: [rOuter, rCounter],
    p: [pOuter, pCounter],
    a: [aOuter, aCounter],
    n: [nOuter],
  };
  const glyphBounds = Object.fromEntries(
    Object.entries(glyphContours).map(([name, glyph]) => [
      name,
      contourBounds(glyph),
    ]),
  );
  const glyphPaths = Object.fromEntries(
    Object.entries(glyphContours).map(([name, glyph]) => [
      name,
      serializeContours(glyph),
    ]),
  );

  const canvasSize = 480;
  const sourceHeight = source.viewBox[3];
  const uniformScale = (canvasSize / 2) / sourceHeight;
  const translateX =
    (canvasSize - source.viewBox[2] * uniformScale) / 2 -
    source.viewBox[0] * uniformScale;
  const translateY =
    (canvasSize - source.viewBox[3] * uniformScale) / 2 -
    source.viewBox[1] * uniformScale;
  const mapBox = (box) => ({
    x: translateX + box.x * uniformScale,
    y: translateY + box.y * uniformScale,
    width: box.width * uniformScale,
    height: box.height * uniformScale,
  });
  const layoutBoxes = Object.fromEntries(
    Object.entries(glyphBounds).map(([name, box]) => [name, mapBox(box)]),
  );

  const pOffsetX = -glyphBounds.p.x;
  const nOffsetX = -glyphBounds.n.x;
  const rToP = compatibleRToP(
    rOuter,
    rCounter,
    pOuter,
    pCounter,
    pOffsetX,
  );
  const aToN = compatibleAToN(aOuter, aCounter, nOuter, nOffsetX);
  const rTrimPath = serializeContours([deriveRTrimRegion(rOuter)]);
  const rTrimSeam = deriveRTrimSeam(rOuter);
  const rTrimMask = deriveRTrimMask(rOuter);

  const barTop = aCounter.segments[3].start[1];
  const barBottom = aOuter.segments[6].start[1];
  const barLeft = Math.min(
    aCounter.segments[3].start[0],
    aCounter.segments[3].end[0],
  );
  const barRight = Math.max(
    aCounter.segments[3].start[0],
    aCounter.segments[3].end[0],
  );
  const barPadding = 2;
  const barRadius = (barBottom - barTop) / 2 + barPadding;
  const barStartX = barLeft - barRadius - 1;
  const barEndX = barRight + barRadius;
  const barCenterY = (barTop + barBottom) / 2;

  return {
    source: {
      fill: source.fill,
      pathData: source.pathData,
      viewBox: source.viewBox,
      contourSignature,
    },
    glyphPaths,
    glyphBounds,
    morphPaths: { rToP, aToN },
    placement: {
      canvasSize,
      scale: uniformScale,
      translateX,
      translateY,
      transform: `translate(${formatNumber(translateX)} ${formatNumber(translateY)}) scale(${formatNumber(uniformScale)})`,
    },
    layoutBoxes,
    travel: {
      rToP: -pOffsetX * uniformScale,
      aToN: -nOffsetX * uniformScale,
    },
    rTrimPath,
    rTrimSeam,
    rTrimMask,
    aBarMask: {
      path: `M${formatNumber(barStartX)} ${formatNumber(barCenterY)}L${formatNumber(barEndX)} ${formatNumber(barCenterY)}`,
      length: barEndX - barStartX,
      strokeWidth: barRadius * 2,
      bounds: {
        x: barStartX - barRadius,
        y: barCenterY - barRadius,
        width: barEndX - barStartX + barRadius * 2,
        height: barRadius * 2,
      },
    },
  };
}

export const rpanSvgGeometryInternals = {
  parseToCubics,
  serializeContours,
};
