const easeOut = (t: number) => 1 - (1 - Math.max(0, Math.min(1, t))) ** 3;
export function attackMotion(age: number, contact: number, projectile: boolean, pet = false) {
  if (age < 0 || age > contact + 0.35)
    return { frame: 0, reach: 0, lift: 0, tilt: 0, sx: 1, sy: 1 };
  const windup = projectile ? Math.min(0.2, contact * 0.35) : contact * 0.58;
  if (age < windup) {
    const t = age / windup;
    return {
      frame: 1,
      reach: projectile ? 0 : -0.035 * t * t,
      lift: 0,
      tilt: -0.07 * t,
      sx: 1 + 0.04 * t,
      sy: 1 - 0.04 * t,
    };
  }
  if (age <= contact) {
    const t = easeOut((age - windup) / (contact - windup));
    return {
      frame: 2,
      reach: projectile ? 0 : t,
      lift: pet ? Math.sin(t * Math.PI) * 32 : Math.sin(t * Math.PI) * 4,
      tilt: 0.08 * t,
      sx: 1 + 0.08 * t,
      sy: 1 - 0.05 * t,
    };
  }
  const t = easeOut((age - contact) / 0.35);
  return {
    frame: 3,
    reach: projectile ? 0 : 1 - t,
    lift: pet ? Math.sin(t * Math.PI) * 9 : 0,
    tilt: 0.08 * (1 - t),
    sx: 1 + 0.08 * (1 - t),
    sy: 1 - 0.05 * (1 - t),
  };
}
