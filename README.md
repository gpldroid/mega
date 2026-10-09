# MEGA — Website to Android

MEGA turns an HTTP(S) website into an Android WebView project and builds APK, AAB and source ZIP with GitHub Actions.

## Stack
- React + Vite + TypeScript + Tailwind CSS
- Supabase Auth, PostgreSQL, RLS and Edge Functions
- GitHub Actions + Android Gradle Plugin

## Local setup
1. Copy `.env.example` to `.env.local` and optionally override the Supabase project URL/key.
2. `npm install`
3. `npm run dev`

## Required Supabase Edge Function secrets
Open Supabase Dashboard → Edge Functions → Secrets and set:
- `GITHUB_TOKEN`: fine-grained GitHub PAT with Contents: Read and write and Metadata: Read-only on `gpldroid/mega`.
- `GITHUB_REPOSITORY=gpldroid/mega`
- `SUPABASE_SERVICE_ROLE_KEY`: service-role key; server-side only.
- `SUPABASE_ANON_KEY`: project publishable/anon key.
- `APP_ORIGIN`: deployed frontend origin. Use `*` only during development.

## Required GitHub Actions repository secrets
In GitHub → Settings → Secrets and variables → Actions add:
- `SUPABASE_URL=https://upajzbaeuwzbhxfebzvi.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY`: service-role key from Supabase API settings.
- `SUPABASE_ANON_KEY`: publishable/anon key.

The Android workflow uses its built-in `GITHUB_TOKEN` with contents write permission to publish each build as a prerelease with APK, AAB and source ZIP assets.

## Supabase setup already applied
The `mega_initial_schema` and `mega_rls_admin_function` migrations were applied to project `upajzbaeuwzbhxfebzvi`. The `request-build` Edge Function is deployed. Set the secrets above before requesting builds.

After registering and signing in, grant admin access manually in the Supabase SQL Editor:
```sql
update public.profiles set role = 'admin' where email = 'YOUR_EMAIL';
```

## GitHub Pages deployment
1. Add GitHub Actions secrets `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` if you want to override the public defaults.
2. In repository Settings → Pages, set the source to **GitHub Actions**.
3. Push to `main`; `.github/workflows/deploy-pages.yml` builds and deploys the static frontend.

## Signing and security
Generated APK/AAB currently use the Android debug signing config so that test builds can be installed. Before production distribution or Play Console publishing, configure a private release keystore in GitHub Actions secrets and replace the debug signing configuration. Never commit keystores or signing passwords.

The first implementation stores only download URLs in Supabase; binary files are published as GitHub Release assets rather than committed to git history. The app icon URL is stored, but actual icon generation is a follow-up enhancement; the initial Android template uses the default launcher icon. A website may also restrict WebView embedding or require additional permissions/cookies/deep-link handling.
