export function calculateReadiness(checkin) {
  const sleepHours = Number(checkin.sleep_hours);
  const sleepDurationScore = sleepHours < 5 ? 1 : sleepHours < 6.5 ? 2 : sleepHours <= 8.5 ? 4 : sleepHours <= 10 ? 3 : 2;
  return Number(((sleepDurationScore + Number(checkin.sleep_quality) + Number(checkin.energy_score) + (6 - Number(checkin.soreness_score)) + (6 - Number(checkin.stress_score))) / 5).toFixed(1));
}

export function validateWellnessCheckin(body) {
  const values = [body?.sleep_hours, body?.sleep_quality, body?.energy_score, body?.soreness_score, body?.stress_score];
  return values.every((value) => Number.isFinite(Number(value)))
    && Number(body.sleep_hours) >= 0 && Number(body.sleep_hours) <= 24
    && [body.sleep_quality, body.energy_score, body.soreness_score, body.stress_score].every((value) => Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 5)
    && String(body.notes || "").length <= 500;
}
