export const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  caregiver: 'Caregiver',
  it_support: 'IT Support',
  driver: 'Transport & Caregiver',
  manager: 'Manager',
};

export const roleLabel = (role: string) =>
  ROLE_LABELS[role] || role.replace('_', ' ');

// Auto-checkout cutoff hour (24h, Arizona time) per role.
// Returns the earliest cutoff among the user's roles.
export const getAutoCheckoutHourForRoles = (roles: string[]): number => {
  if (!roles || roles.length === 0) return 18;
  const hours = roles.map((r) => {
    if (r === 'caregiver') return 16.5; // 4:30 PM
    if (r === 'driver') return 18;      // 6:00 PM
    return 18;
  });
  return Math.min(...hours);
};

export const formatHour12 = (hour: number) => {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  const period = h >= 12 ? 'PM' : 'AM';
  const display = ((h + 11) % 12) + 1;
  return `${display}:${String(m).padStart(2, '0')} ${period}`;
};
