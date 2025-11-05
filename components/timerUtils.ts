export const computeRemainingSeconds = (endTimestamp: number | null): number => {
  if (!endTimestamp) return 0;
  return Math.max(0, Math.round((endTimestamp - Date.now()) / 1000));
};

export const computeElapsedSeconds = (startTimestamp: number | null, accumulated: number = 0): number => {
  let elapsed = accumulated;
  if (startTimestamp) elapsed += Math.round((Date.now() - startTimestamp) / 1000);
  return Math.max(0, elapsed);
};
