import {
  Wrench, RefreshCw, CalendarClock, BellRing, FileText,
  LayoutDashboard, Search, PlusCircle, ArrowRight,
} from 'lucide-react';
import LoginPage from './LoginPage.jsx';

/* Digvy brand mark — navy rounded square with a light-blue "D" (matches favicon.svg). */
function Logo({ size = 28 }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-[22%] bg-slate-800 font-bold text-blue-400"
      style={{ width: size, height: size, fontSize: size * 0.6, lineHeight: 1 }}
      aria-hidden="true"
    >
      D
    </span>
  );
}

const USE_CASES = [
  {
    icon: Wrench,
    tile: 'bg-amber-50 text-amber-600',
    title: 'Recurring maintenance',
    body: 'HVAC filters, gutter cleaning, oil changes, and the every-few-months chores that are easy to forget until something breaks.',
  },
  {
    icon: RefreshCw,
    tile: 'bg-blue-50 text-blue-600',
    title: 'Subscriptions & renewals',
    body: 'Domains, memberships, and insurance policies that come due once a year — see them coming instead of being surprised.',
  },
  {
    icon: CalendarClock,
    tile: 'bg-violet-50 text-violet-600',
    title: 'Appointments',
    body: 'The dentist, eye exam, or annual physical that quietly slides from “I should book that” to a year overdue.',
  },
  {
    icon: BellRing,
    tile: 'bg-rose-50 text-rose-600',
    title: 'Cancel-by deadlines',
    body: 'Free trials and auto-renewals you need to cancel before a specific date. Digvy flags them early so they don’t become charges.',
  },
  {
    icon: FileText,
    tile: 'bg-emerald-50 text-emerald-600',
    title: 'One-time reference records',
    body: 'Warranty details, model numbers, and account numbers you don’t act on — you just need to find them later.',
  },
];

const STEPS = [
  {
    icon: PlusCircle,
    title: 'Add or import your items',
    body: 'Type them in, pick from starter suggestions, or import a CSV of what you already track.',
  },
  {
    icon: LayoutDashboard,
    title: 'See what needs action',
    body: 'The dashboard surfaces what’s overdue, due soon, or approaching a cancel-by deadline — and nothing else.',
  },
  {
    icon: Search,
    title: 'Find everything else instantly',
    body: 'The rest stays in a searchable history, out of the way until the day you actually need it.',
  },
];

const FAQS = [
  {
    q: 'How is Digvy different from a to-do app or calendar?',
    a: 'To-do apps and calendars are built for things happening today or this week. Digvy is built for events that recur on long, irregular cycles — every 3 months, every year, or on a one-off deadline. It surfaces only what needs action now and keeps everything else searchable.',
  },
  {
    q: 'Can Digvy remind me before a free trial renews?',
    a: 'Yes. Digvy tracks cancel-by deadlines as a first-class field, flags them as they approach, and includes them in a daily email digest so you can cancel in time instead of getting charged.',
  },
  {
    q: 'What kinds of things can I track?',
    a: 'Recurring maintenance, subscriptions and renewals, appointments, cancel-by deadlines for trials and auto-renewals, and one-time reference records like warranties, model numbers, and account numbers.',
  },
  {
    q: 'How much does Digvy cost?',
    a: 'Digvy is free to use. You create an account with an email and password to get started.',
  },
  {
    q: 'Do I have to enter everything by hand?',
    a: 'No. You can import your list from a CSV, and Digvy offers starter suggestions for common items when you sign up, so you can get going in a couple of minutes.',
  },
];

/* Sample rows that reproduce the real dashboard card (white card, colored left
   border, urgency dot + label) so the preview reflects the actual product. */
const PREVIEW_ITEMS = [
  { name: 'Furnace filter', category: 'Home', border: 'border-red-400', dot: 'bg-red-500', text: 'text-red-700', label: 'Overdue 5d ago' },
  { name: 'Prime Video trial', category: 'Subscriptions', border: 'border-amber-400', dot: 'bg-amber-500', text: 'text-amber-700', label: 'Cancel by in 3d' },
  { name: 'Teeth cleaning', category: 'Health', border: 'border-amber-400', dot: 'bg-amber-500', text: 'text-amber-700', label: 'Due in 12d' },
  { name: 'mysite.com domain', category: 'Accounts', border: 'border-green-400', dot: 'bg-green-500', text: 'text-green-700', label: 'Renews in 88d' },
];

function AppPreview() {
  return (
    <div className="relative mx-auto w-full max-w-sm">
      {/* soft glow behind the device */}
      <div className="absolute -inset-6 rounded-[2rem] bg-blue-500/20 blur-2xl" aria-hidden="true" />
      <div className="relative rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10 overflow-hidden">
        {/* window chrome */}
        <div className="flex items-center gap-2 px-4 h-9 bg-slate-100 border-b border-slate-200">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
        </div>
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Logo size={22} />
            <span className="text-sm font-semibold text-slate-900">Needs action</span>
            <span className="ml-auto text-[11px] font-medium text-slate-400">4 items</span>
          </div>
          <div className="space-y-2">
            {PREVIEW_ITEMS.map((it) => (
              <div
                key={it.name}
                className={`rounded-lg border-l-4 ${it.border} bg-white ring-1 ring-slate-100 p-2.5 shadow-sm flex items-start justify-between gap-2`}
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-slate-900 truncate">{it.name}</p>
                  <p className="text-[11px] text-slate-500">{it.category}</p>
                </div>
                <span className={`inline-flex items-center gap-1 text-[11px] font-medium shrink-0 ${it.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${it.dot}`} />
                  {it.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function scrollToId(id) {
  return (e) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header (sits over the dark hero) */}
      <header className="absolute top-0 inset-x-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <span className="flex items-center gap-2 text-white">
            <Logo />
            <span className="text-lg font-bold tracking-tight">Digvy</span>
          </span>
          <a
            href="#signup"
            onClick={scrollToId('signup')}
            className="text-sm font-medium text-slate-200 hover:text-white"
          >
            Sign in
          </a>
        </div>
      </header>

      <main>
        {/* Hero — deep navy brand band */}
        <section className="relative overflow-hidden bg-slate-900 text-white">
          <div
            className="absolute inset-0 opacity-70"
            style={{ background: 'radial-gradient(60rem 40rem at 75% -10%, rgba(37,99,235,0.35), transparent 60%), radial-gradient(50rem 40rem at 0% 110%, rgba(96,165,250,0.18), transparent 55%)' }}
            aria-hidden="true"
          />
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-20 grid lg:grid-cols-2 gap-14 items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-blue-200 ring-1 ring-white/15">
                For life’s every-few-months stuff
              </span>
              <h1 className="mt-5 text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1]">
                Get life’s admin <span className="text-blue-400">off your mind</span>
              </h1>
              <p className="mt-5 text-lg text-slate-300 max-w-xl">
                The renewals, appointments, maintenance, and free-trial cancel-by deadlines you keep
                half-remembering — Digvy holds them all so you don’t have to, and tells you the moment
                one needs you. Everything else stays quietly searchable.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a
                  href="#signup"
                  onClick={scrollToId('signup')}
                  className="inline-flex items-center gap-1.5 px-5 py-3 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-500 shadow-lg shadow-blue-900/40"
                >
                  Get started free <ArrowRight size={16} />
                </a>
                <a
                  href="#how-it-works"
                  onClick={scrollToId('how-it-works')}
                  className="px-5 py-3 text-sm font-semibold text-white rounded-lg ring-1 ring-white/25 hover:bg-white/10"
                >
                  See how it works
                </a>
              </div>
              <p className="mt-4 text-xs text-slate-400">Free · No credit card required</p>
            </div>
            <AppPreview />
          </div>
        </section>

        {/* Use cases */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-slate-900">
            For the things you deal with a few times a year
          </h2>
          <p className="mt-3 text-center text-slate-600 max-w-2xl mx-auto">
            Not a few times a day. Digvy is purpose-built for long, irregular cycles.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {USE_CASES.map(({ icon: Icon, tile, title, body }) => (
              <div key={title} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${tile}`}>
                  <Icon size={22} />
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>
                <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-20 bg-white border-y border-slate-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
            <h2 className="text-2xl sm:text-3xl font-bold text-center text-slate-900">How it works</h2>
            <div className="mt-12 grid gap-10 sm:grid-cols-3">
              {STEPS.map(({ icon: Icon, title, body }, i) => (
                <div key={title} className="relative text-center px-2">
                  <div className="mx-auto w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center text-blue-400 shadow-lg shadow-slate-900/20">
                    <Icon size={24} />
                  </div>
                  <div className="mt-4 text-xs font-bold uppercase tracking-wide text-blue-600">Step {i + 1}</div>
                  <h3 className="mt-1 text-base font-semibold text-slate-900">{title}</h3>
                  <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-slate-900">Frequently asked questions</h2>
          <div className="mt-10 space-y-3">
            {FAQS.map(({ q, a }) => (
              <details key={q} className="group bg-white rounded-2xl border border-slate-200 shadow-sm p-5 open:shadow-md transition-shadow">
                <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-slate-900 list-none">
                  {q}
                  <span className="ml-4 text-xl leading-none text-slate-400 transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Sign up / auth */}
        <section id="signup" className="scroll-mt-20 bg-white border-y border-slate-200">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
            <div className="text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Start tracking in a couple of minutes</h2>
              <p className="mt-3 text-slate-600">Create a free account, or sign in if you already have one.</p>
            </div>
            <div className="mt-8">
              <LoginPage embedded initialMode="signup" />
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-slate-900 border-t border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-center">
          <span className="flex items-center gap-2 text-white">
            <Logo size={22} />
            <span className="font-semibold">Digvy</span>
          </span>
          <p className="text-sm text-slate-400">
            Track the infrequent life events that slip through the cracks.
          </p>
        </div>
      </footer>
    </div>
  );
}
