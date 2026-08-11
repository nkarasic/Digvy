// The public origin of the deployed app, used for links in outbound email and
// for Supabase auth redirects.
//
// Read lazily (not as a module-level constant) so tests and scripts can set
// APP_URL after import, matching how db.js defers its client init.
//
// NOTE: the fallback is only a fallback — set APP_URL in the deployment
// environment. Anything passed to Supabase as a `redirectTo` must also be in
// the dashboard's Authentication → URL Configuration allow-list, or Supabase
// silently substitutes the configured Site URL.
export const appUrl = () => process.env.APP_URL || 'https://www.digvy.com';
