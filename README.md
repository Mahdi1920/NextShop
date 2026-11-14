# NextShop

NextShop is an Nx workspace for an e-commerce platform. It contains the storefront, admin application, backend, and shared frontend library.

## Projects

| Project | Directory | Purpose |
| --- | --- | --- |
| `frontend` | `e-commercefrontend/` | Customer storefront |
| `admin` | `e-commerceadmin/` | Admin application |
| `backend` | `e-commercebackend/` | Backend service |
| `frontend-shared` | `frontend-shared/` | Shared frontend library |

## Working with the workspace

Install dependencies using the package manager configured by the individual projects. Nx project configuration is defined in each project's `project.json`; inspect available targets with:

```sh
npx nx show projects
npx nx show project frontend
```

Run a configured target with `npx nx run <project>:<target>`, for example:

```sh
npx nx run frontend:serve
```

See each project directory for project-specific setup and commands.
