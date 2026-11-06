# Supabase setup

## Local development

1. Install Docker Desktop and the Supabase CLI, then start the local stack from the project root:

   ```sh
   npx supabase start
   ```

2. Copy `.env.example` to `.env`. Fill in `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` using the local values printed by `npx supabase status`.
3. Apply the committed migrations to the local database:

   ```sh
   npx supabase db reset
   ```

4. Run the database security suite:

   ```sh
   npx supabase test db
   ```

Local Auth confirmation emails are captured by the Supabase local mail service. Open its URL shown by `npx supabase status`, then follow the confirmation link on a device with the app scheme configured.

## Hosted project

Create a Supabase project, then copy its project URL and **publishable key** into `.env`. In Supabase Auth URL Configuration, allow `teslaapp://auth/callback` as a redirect URL. Keep the matching callback URI enabled in the app's `scheme` configuration.

Link the project and apply the committed migrations:

```sh
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Configure SMTP before relying on hosted email confirmation. Run the database tests against a local Supabase stack before applying schema changes to production.

The mobile app uses only the publishable key. Never put a Supabase secret or `service_role` key in the app, `.env` variables prefixed with `EXPO_PUBLIC_`, or any committed file. No Tesla credentials are part of these migrations.
