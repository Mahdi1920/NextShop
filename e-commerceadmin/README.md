# NextShop Admin

This is the standalone administrator interface. It runs on port `3002` during development and uses the shared NestJS API.

From the Nx workspace root, start it with:

```bash
nx run admin:serve
```

The API URL defaults to `http://localhost:3001/api/v1`. Set `NEXT_PUBLIC_API_URL` in `admin-app/.env.local` when the API runs at a different address. Only accounts with the `ADMIN` role can sign in; the NestJS API independently enforces authorization on admin operations.
