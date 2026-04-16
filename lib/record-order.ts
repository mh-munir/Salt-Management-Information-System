type RecordDateValue = string | Date | number | null | undefined;

const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

const getDateTimestamp = (value?: RecordDateValue) => {
  if (value === null || value === undefined) return 0;

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

export const getInputTimestamp = (id?: string | null, fallbackDate?: RecordDateValue) => {
  const normalizedId = id?.trim() ?? "";
  if (OBJECT_ID_PATTERN.test(normalizedId)) {
    return parseInt(normalizedId.slice(0, 8), 16) * 1000;
  }

  return getDateTimestamp(fallbackDate);
};

export const compareByLatestInput = (
  left: { id?: string | null; date?: RecordDateValue },
  right: { id?: string | null; date?: RecordDateValue }
) => {
  const inputTimeDelta =
    getInputTimestamp(right.id, right.date) - getInputTimestamp(left.id, left.date);
  if (inputTimeDelta !== 0) return inputTimeDelta;

  const dateDelta = getDateTimestamp(right.date) - getDateTimestamp(left.date);
  if (dateDelta !== 0) return dateDelta;

  return (right.id ?? "").localeCompare(left.id ?? "");
};

export const compareByEarliestInput = (
  left: { id?: string | null; date?: RecordDateValue },
  right: { id?: string | null; date?: RecordDateValue }
) => compareByLatestInput(right, left);
