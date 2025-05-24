# Deploying Planeto to Fly.io

This guide details deploying Planeto to Fly.io, focusing on cost-effectiveness and best practices for a Next.js application with Server-Sent Events (SSE).

## Overview

Planeto is containerized using Docker and hosted on Fly.io. The configuration aims for minimal idle resource usage, scaling to a single small machine when active.

## Prerequisites

1.  **Fly.io Account**: [fly.io](https://fly.io/)
2.  **`flyctl` CLI**: [fly.io/docs/hands-on/install-flyctl/](https://fly.io/docs/hands-on/install-flyctl/)
3.  **Docker**: (Optional for local builds) Installed and running.
4.  **Project Files**: `Dockerfile` and `fly.toml` in the project root.

## Key Configuration Files

- `Dockerfile`: Defines the Next.js application build process for an optimized production image.
- `.dockerignore`: Excludes files/directories from the Docker build context, reducing image size and build time.
- `next.config.ts`: Configured with `output: 'standalone'` for minimal server deployment.
- `fly.toml`: Fly.io application configuration, located in the project root, defining services, resources, health checks, and deployment settings.

## `fly.toml` Configuration Explained

The `fly.toml` file in the project root dictates how Fly.io deploys and manages the Planeto application. Below is an explanation of its key settings and their implications for a cost-effective and efficient deployment.

Key settings in `fly.toml` include:

- **`app = 'planeto'`**: Defines the unique name of the application on Fly.io.
- **`primary_region = 'lhr'`**: Specifies the primary region where the application will be deployed (e.g., London).

- **`[http_service]` section**: Configures how HTTP traffic is handled.

  - `internal_port = 3000`: The port inside the Docker container where the Next.js application listens.
  - `force_https = true`: Automatically redirects HTTP requests to HTTPS.
  - `auto_stop_machines = 'stop'` and `auto_start_machines = true`: These are crucial for cost-saving. Machines will stop when idle and automatically restart when a new request comes in. `'stop'` suspends the VM for a faster resume compared to `'off'` which terminates it.
  - `min_machines_running = 0` and `max_machines_running = 1`: Ensures the application scales down to zero machines when not in use, and scales up to a maximum of one machine, suitable for this application's expected load and to keep costs minimal.
  - `processes = ['app']`: Links this service to the 'app' process group defined in the Dockerfile (typically the main application command).

- **`[[vm]]` section**: Defines the virtual machine resources.
  - `memory = '256mb'`: Specifies the smallest memory allocation that typically includes a dedicated IPv4 address on Fly.io, suitable for running a Next.js standalone application.
  - `cpu_kind = 'shared'` and `cpus = 1`: Uses a cost-effective shared CPU.

**Important Considerations based on `fly.toml`:**

- **Services and Health Checks**: The project's `fly.toml` relies on Fly.io's default behavior for service creation and health checks, as it does not explicitly define `[[services]]` or `[[services.http_checks]]` blocks.
  - Fly.io automatically creates a default service for the `[http_service]`, mapping external ports 80 (HTTP) and 443 (HTTPS) to the `internal_port` (3000).
  - Default health checks are performed by Fly.io. For an HTTP service, this usually involves checking the `/` path on the `internal_port`.
- **SSE (Server-Sent Events)**: Fly.io's default HTTP/2 proxying handles SSE connections effectively. The default health checks ensure the application remains responsive, which is important for SSE reliability.
- **Build Process**: The `[build]` section is minimal, as Fly.io automatically uses the `Dockerfile` in the project root for building the application image.

For the complete and definitive configuration, please always refer to the `fly.toml` file in the project's root directory.

## Deployment Steps

1.  \*\*Login to `
