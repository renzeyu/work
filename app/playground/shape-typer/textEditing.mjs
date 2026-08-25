export const MAX_TYPER_CHARACTERS = 180;
export const CHARACTER_COUNT_WARNING_THRESHOLD = 150;

/**
 * Show the limit reminder only when the user is approaching the cap.
 *
 * @param {string} value
 */
export function shouldShowCharacterCount(value) {
  return Array.from(value).length >= CHARACTER_COUNT_WARNING_THRESHOLD;
}

/**
 * Limit text by Unicode code points so emoji and other surrogate pairs are
 * never split in half.
 *
 * @param {string} value
 * @param {number} [maxCharacters]
 */
export function limitTyperText(
  value,
  maxCharacters = MAX_TYPER_CHARACTERS,
) {
  const safeMaximum = Number.isFinite(maxCharacters)
    ? Math.max(0, Math.trunc(maxCharacters))
    : MAX_TYPER_CHARACTERS;
  return Array.from(value).slice(0, safeMaximum).join("");
}

/**
 * Convert a textarea's UTF-16 selection offset to the code-point indexing
 * used by the typer. An offset inside a surrogate pair resolves to the start
 * of that character.
 *
 * @param {string} value
 * @param {number} codeUnitOffset
 */
export function codePointIndexFromCodeUnitOffset(value, codeUnitOffset) {
  const safeOffset = Number.isFinite(codeUnitOffset)
    ? Math.min(Math.max(Math.trunc(codeUnitOffset), 0), value.length)
    : 0;
  let consumedCodeUnits = 0;
  let codePointIndex = 0;

  for (const character of value) {
    const nextOffset = consumedCodeUnits + character.length;
    if (nextOffset > safeOffset) break;
    consumedCodeUnits = nextOffset;
    codePointIndex += 1;
  }

  return codePointIndex;
}

/**
 * Convert the typer's code-point index back to a native textarea offset.
 *
 * @param {string} value
 * @param {number} codePointIndex
 */
export function codeUnitOffsetFromCodePointIndex(value, codePointIndex) {
  const safeIndex = Number.isFinite(codePointIndex)
    ? Math.max(0, Math.trunc(codePointIndex))
    : 0;
  return Array.from(value).slice(0, safeIndex).join("").length;
}

/**
 * Find the smallest changed range when the browser does not provide a useful
 * beforeinput operation. Explicit selection data is preferred because this
 * fallback is necessarily ambiguous for repeated characters.
 *
 * @param {string} previousText
 * @param {string} nextText
 */
export function findTextEditBounds(previousText, nextText) {
  const previousCharacters = Array.from(previousText);
  const nextCharacters = Array.from(nextText);
  let prefixLength = 0;

  while (
    prefixLength < previousCharacters.length &&
    prefixLength < nextCharacters.length &&
    previousCharacters[prefixLength] === nextCharacters[prefixLength]
  ) {
    prefixLength += 1;
  }

  let previousEnd = previousCharacters.length;
  let nextEnd = nextCharacters.length;
  while (
    previousEnd > prefixLength &&
    nextEnd > prefixLength &&
    previousCharacters[previousEnd - 1] === nextCharacters[nextEnd - 1]
  ) {
    previousEnd -= 1;
    nextEnd -= 1;
  }

  return { prefixLength, previousEnd, nextEnd };
}

/**
 * Resolve one native textarea edit into the typer's code-point range. The raw
 * requested value is retained long enough to distinguish inserted content
 * from a suffix truncated by the 180-character limit.
 *
 * @param {{
 *   previousText: string;
 *   requestedText: string;
 *   selectionStart?: number | null;
 *   selectionEnd?: number | null;
 *   inputType?: string;
 *   maxCharacters?: number;
 * }} options
 */
export function resolveTyperTextEdit({
  previousText,
  requestedText,
  selectionStart = null,
  selectionEnd = null,
  inputType = "",
  maxCharacters = MAX_TYPER_CHARACTERS,
}) {
  const nextText = limitTyperText(requestedText, maxCharacters);
  const fallback = () => ({
    nextText,
    editBounds: findTextEditBounds(previousText, nextText),
  });

  if (
    !Number.isFinite(selectionStart) ||
    !Number.isFinite(selectionEnd) ||
    !inputType ||
    inputType.startsWith("history")
  ) {
    return fallback();
  }

  const previousCharacters = Array.from(previousText);
  const requestedCharacters = Array.from(requestedText);
  const nextCharacters = Array.from(nextText);
  const previousLength = previousCharacters.length;
  const start = codePointIndexFromCodeUnitOffset(
    previousText,
    /** @type {number} */ (selectionStart),
  );
  const end = Math.max(
    start,
    codePointIndexFromCodeUnitOffset(
      previousText,
      /** @type {number} */ (selectionEnd),
    ),
  );

  let prefixLength = start;
  let previousEnd = end;
  let insertedLength = 0;

  if (inputType.startsWith("delete") && start === end) {
    const removedLength = previousLength - requestedCharacters.length;
    if (removedLength <= 0) return fallback();

    if (/Backward$/u.test(inputType)) {
      prefixLength = Math.max(0, start - removedLength);
      previousEnd = start;
    } else if (/Forward$/u.test(inputType)) {
      prefixLength = start;
      previousEnd = Math.min(previousLength, start + removedLength);
    } else {
      return fallback();
    }
  } else {
    const retainedLength = previousLength - (end - start);
    const rawInsertedLength = requestedCharacters.length - retainedLength;
    if (rawInsertedLength < 0) return fallback();

    const safeMaximum = Number.isFinite(maxCharacters)
      ? Math.max(0, Math.trunc(maxCharacters))
      : MAX_TYPER_CHARACTERS;
    insertedLength = Math.min(
      rawInsertedLength,
      Math.max(0, safeMaximum - start),
    );
  }

  const nextEnd = prefixLength + insertedLength;
  const unchangedPrefix = previousCharacters
    .slice(0, prefixLength)
    .every((character, index) => requestedCharacters[index] === character);
  const requestedSuffixStart =
    prefixLength +
    Math.max(
      0,
      requestedCharacters.length -
        (previousLength - previousEnd) -
        prefixLength,
    );
  const unchangedSuffix = previousCharacters
    .slice(previousEnd)
    .every(
      (character, index) =>
        requestedCharacters[requestedSuffixStart + index] === character,
    );

  if (!unchangedPrefix || !unchangedSuffix || nextEnd > nextCharacters.length) {
    return fallback();
  }

  return {
    nextText,
    editBounds: { prefixLength, previousEnd, nextEnd },
  };
}

/**
 * Move an index around a single replacement range. Indices inside deleted or
 * replaced content return null.
 *
 * @param {number} index
 * @param {{ prefixLength: number; previousEnd: number; nextEnd: number }} bounds
 */
export function rebaseTextIndex(index, bounds) {
  if (index < bounds.prefixLength) return index;
  if (index >= bounds.previousEnd) {
    return index + (bounds.nextEnd - bounds.previousEnd);
  }
  return null;
}

/**
 * Match a browser undo/redo value to the closest saved editor state. This is
 * what keeps retained-shape settings exact when the text itself is ambiguous,
 * such as inserting and undoing one `a` inside `aaa`.
 *
 * @param {Array<{ text: string }>} entries
 * @param {number} currentIndex
 * @param {string} inputType
 * @param {string} nextText
 */
export function findTextHistoryIndex(
  entries,
  currentIndex,
  inputType,
  nextText,
) {
  const direction = inputType === "historyUndo"
    ? -1
    : inputType === "historyRedo"
      ? 1
      : 0;
  if (direction === 0) return -1;

  for (
    let index = currentIndex + direction;
    index >= 0 && index < entries.length;
    index += direction
  ) {
    if (entries[index]?.text === nextText) return index;
  }

  return -1;
}
