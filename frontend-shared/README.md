# Frontend shared library

This Nx source library owns frontend code used by both the storefront and admin apps. It contains API integrations, shared auth and locale state, enums and models, translations, the app shell, reusable UI and table components, and reusable home and profile screens.

Import modules with the `@shared/*` alias. App-specific routes and feature pages stay in their applications. The apps keep familiar `@/components`, `@/api`, and related aliases, which resolve to this library for shared modules. Internal library imports use `@shared/*` so the library does not depend on either app's source tree.

The library is compiled from source by the Next.js apps; it is not published as a separate package.
