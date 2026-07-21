import {
  Car, Wrench, ShieldCheck, Wind, BellRing, Home,
  Stethoscope, HeartPulse, Eye, Plane, BadgeCheck,
  Wifi, Palette, ScanBarcode,
} from 'lucide-react';

// Starter suggestions shown during onboarding (and via "Add from suggestions").
// Each entry maps directly onto the item create shape; dates are intentionally
// deferred — the user sets them later from the dashboard.
//
// `timing` is the plain-language label shown on the card — it stands in for the
// Fixed / Interval / Reference vocabulary so new users never have to learn it.
// `recommended: true` items are pre-selected on first run.
// `detailsHint` is placeholder text for the "Finish setup" step — it guides what
// to type without being stored as real data.

export const STARTER_GROUPS = [
  {
    label: 'Auto',
    templates: [
      { id: 'car-registration', name: 'Car registration renewal', category: 'Auto', logic_type: 'Interval', interval_months: 12, timing: 'Renews yearly', icon: Car, recommended: true },
      { id: 'oil-change', name: 'Oil change', category: 'Auto', logic_type: 'Interval', interval_months: 6, date_type: 'flexible', timing: 'Every 6 months', icon: Wrench },
      { id: 'car-insurance', name: 'Car insurance renewal', category: 'Insurance', logic_type: 'Interval', interval_months: 6, timing: 'Every 6 months', icon: ShieldCheck },
    ],
  },
  {
    label: 'Home',
    templates: [
      { id: 'hvac-filter', name: 'HVAC filter', category: 'Home', logic_type: 'Interval', interval_months: 3, date_type: 'flexible', detailsHint: 'Filter size, e.g. 20x25x1', timing: 'Every 3 months · saves size', icon: Wind, recommended: true },
      { id: 'smoke-batteries', name: 'Smoke detector batteries', category: 'Home', logic_type: 'Interval', interval_months: 12, timing: 'Yearly', icon: BellRing },
      { id: 'gutter-cleaning', name: 'Gutter cleaning', category: 'Home', logic_type: 'Interval', interval_months: 12, date_type: 'flexible', timing: 'Yearly', icon: Home },
    ],
  },
  {
    label: 'Health',
    templates: [
      { id: 'dental-cleaning', name: 'Dental cleaning', category: 'Health', logic_type: 'Interval', interval_months: 6, date_type: 'flexible', timing: 'Every 6 months', icon: Stethoscope, recommended: true },
      { id: 'annual-physical', name: 'Annual physical', category: 'Health', logic_type: 'Interval', interval_months: 12, date_type: 'flexible', timing: 'Yearly', icon: HeartPulse },
      { id: 'eye-exam', name: 'Eye exam', category: 'Health', logic_type: 'Interval', interval_months: 12, date_type: 'flexible', timing: 'Yearly', icon: Eye },
    ],
  },
  {
    label: 'Travel & ID',
    templates: [
      { id: 'passport', name: 'Passport renewal', category: 'Travel', logic_type: 'Fixed', timing: 'On a fixed date', icon: Plane, recommended: true },
      { id: 'global-entry', name: 'Global Entry / PreCheck', category: 'Travel', logic_type: 'Fixed', timing: 'On a fixed date', icon: BadgeCheck },
    ],
  },
  {
    label: 'Keep for reference',
    templates: [
      { id: 'wifi-password', name: 'Wi-Fi password', category: 'Home', logic_type: 'Reference', detailsHint: 'Network name and password', timing: 'No date — just info', icon: Wifi },
      { id: 'paint-colors', name: 'Paint colors', category: 'Home', logic_type: 'Reference', detailsHint: 'Room / brand / color code / finish', timing: 'No date — just info', icon: Palette },
      { id: 'vehicle-vin', name: 'Vehicle VIN', category: 'Auto', logic_type: 'Reference', detailsHint: 'VIN (17 characters)', timing: 'No date — just info', icon: ScanBarcode },
    ],
  },
];

// Flat list, useful for lookups.
export const STARTER_TEMPLATES = STARTER_GROUPS.flatMap(g => g.templates);

// Look up a template by its (unique) name — used to recover the placeholder hint
// and icon for an item returned from the bulk-create call.
export const TEMPLATE_BY_NAME = Object.fromEntries(
  STARTER_TEMPLATES.map(t => [t.name, t])
);

// Convert a template into the payload the create/import API expects. Details are
// left empty (the hint is only a placeholder); the user fills them in the
// "Finish setup" step or later from the item's edit screen.
export function templateToItem(t) {
  return {
    name: t.name,
    category: t.category,
    status: 'Active',
    logic_type: t.logic_type,
    interval_months: t.logic_type === 'Interval' ? t.interval_months : null,
    date_type: t.logic_type === 'Reference' ? 'firm' : (t.date_type || 'firm'),
    details: '',
    next_date: null,
    is_evergreen: false,
  };
}
