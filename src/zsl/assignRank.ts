type RankablePoints = { points: number };
type RankablePointsAndTime = RankablePoints & { time: number };

export function assignRank<
  HasTime extends boolean,
  T extends HasTime extends true ? RankablePointsAndTime : RankablePoints
>(
  rows: T[],
  options?: { useTime?: HasTime }
): (T & { position: number })[] {
  if (rows.length === 0 || !rows[0]) return [];

  const firstRow = rows[0];

  let rank = 1;
  let lastPoints = firstRow.points;
  let lastTime: number | undefined =
    options?.useTime && "time" in firstRow ? firstRow.time : undefined;

  return rows.map((row, idx) => {
    if (idx === 0) {
      return { ...row, position: rank };
    }

    const pointsEqual = row.points === lastPoints;

    // If using time, only tie if both points and time are equal
    if (options?.useTime && "time" in row) {
      if (pointsEqual && row.time === lastTime) {
        return { ...row, position: rank };
      }

      // New rank if points are same but time is different
      rank = idx + 1;
      lastPoints = row.points;
      lastTime = row.time;
      return { ...row, position: rank };
    }

    // If not using time, tie only on points
    if (pointsEqual) {
      return { ...row, position: rank };
    }

    // New rank (with gaps like SQL RANK)
    rank = idx + 1;
    lastPoints = row.points;
    if (options?.useTime && "time" in row) {
      lastTime = row.time;
    }

    return { ...row, position: rank };
  });
}
