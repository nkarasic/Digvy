export const URGENCY_COLORS = {
  red: {
    bg: 'bg-red-50',
    border: 'border-red-400',
    text: 'text-red-700',
    bar: 'bg-red-500',
    badge: 'bg-red-100 text-red-800',
    dot: 'bg-red-500',
  },
  yellow: {
    bg: 'bg-amber-50',
    border: 'border-amber-400',
    text: 'text-amber-700',
    bar: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-800',
    dot: 'bg-amber-500',
  },
  green: {
    bg: 'bg-green-50',
    border: 'border-green-400',
    text: 'text-green-700',
    bar: 'bg-green-500',
    badge: 'bg-green-100 text-green-800',
    dot: 'bg-green-500',
  },
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-400',
    text: 'text-blue-700',
    bar: 'bg-blue-500',
    badge: 'bg-blue-100 text-blue-800',
    dot: 'bg-blue-500',
  },
};

export const STATUS_COLORS = {
  Active: 'bg-blue-100 text-blue-800',
  Inactive: 'bg-gray-100 text-gray-600',
  Historical: 'bg-slate-100 text-slate-600',
};

export const CATEGORIES = [
  'Auto', 'Domain', 'Finance', 'Health', 'Home', 'Insurance',
  'Membership', 'Misc', 'Personal care', 'Subscription', 'Travel',
];

export const INTERVAL_PRESETS = [
  { label: '3 mo', value: 3 },
  { label: '6 mo', value: 6 },
  { label: '12 mo', value: 12 },
  { label: '24 mo', value: 24 },
  { label: '60 mo', value: 60 },
];

export const SNOOZE_PRESETS = [
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
  { label: '1 month', days: 30 },
  { label: '3 months', days: 90 },
];
