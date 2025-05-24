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
- `fly.toml`: Fly.io application configuration (services, resources, health checks, deployment settings).

## `fly.toml` Configuration

```toml
app = 'planeto' # Application name
primary_region = 'lhr' # Primary deployment region

[build]
  # Dockerfile is self-contained; Fly.io uses it automatically.

[http_service]
internal_port = 3000      # App's internal listening port
force_https = true        # Redirect HTTP to HTTPS
auto_stop_machines = 'stop' # 'stop' or 'off' machine when idle
auto_start_machines = true  # Start machine on new requests
min_machines_running = 0    # Scale down to zero machines
max_machines_running = 1    # Max active machines
processes = ['app']       # Corresponds to Dockerfile process group

[[vm]]
memory = '256mb'          # Smallest memory for dedicated IPv4
cpu_kind = 'shared'       # Cost-effective shared CPU
cpus = 1                  # Number of CPUs

[[services]]
protocol = "tcp"
internal_port = 3000      # Matches http_service.internal_port
processes = ["app"]

  [[services.ports]]
  port = 80
  handlers = ["http"]
  force_https = true

  [[services.ports]]
  port = 443
  handlers = ["tls", "http"]

  [[services.http_checks]]
  interval = "10s"
  timeout = "2s"
  method = "GET"
  path = "/"                # Health check path
  grace_period = "5s"       # Allow app start time before first check

# Example concurrency settings (defaults often sufficient)
# [services.concurrency]
# type = "connections" # or 'requests'
# hard_limit = 25
# soft_limit = 20
```

**Notes on `fly.toml`:**

- `auto_stop_machines = 'stop'` & `min_machines_running = 0`: Key for cost savings. App resources are not consumed when idle. `'stop'` suspends the VM for quick resume; `'off'` terminates it (longer startup).
- `memory = '256mb'`: Smallest tier typically providing a dedicated IPv4. Suitable for Next.js startup.
- **SSE**: Fly.io's default HTTP/2 proxying generally supports SSE well. The `/` health check ensures app responsiveness.

## Deployment Steps

1.  **Login to `flyctl`**:

    ```bash
    fly auth login
    ```

2.  **Initial Launch (if new app)**:
    If deploying for the first time or `fly.toml` is missing:

    ```bash
    fly launch
    ```

    - Detects `Dockerfile`.
    - **App Name**: Choose a unique name (e.g., `planeto`).
    - **Organization**: Select your Fly.io organization.
    - **Region**: Choose a region (e.g., `lhr` - London).
    - **PostgreSQL/Redis**: Select **No** for both.
    - **Deploy now?**: Select **No** to review `fly.toml` first, or **Yes** to deploy immediately.
      This registers the app and creates `fly.toml` if needed. (The repository's `fly.toml` is pre-configured).

3.  **Deploy Application**:
    From the project root:

    ```bash
    fly deploy
    ```

    This command builds the Docker image (locally or on Fly.io), pushes it to Fly.io's registry, and provisions/updates machines per `fly.toml`.

4.  **Verify Deployment**:
    `flyctl` will output the application URL. Or open with:
    ```bash
    fly apps open -a <your-app-name>
    ```

## Managing the Application

- **View Logs**:
  ```bash
  fly logs -a <your-app-name>
  ```
- **Application Status**:
  ```bash
  fly status -a <your-app-name>
  ```
- **Manual Scaling** (adjust `fly.toml` for `max_machines_running > 1`):
  ```bash
  fly scale count <number> -a <your-app-name>
  ```
- **Secrets Management** (app restarts on secret changes):
  ```bash
  fly secrets set MY_VAR=value ANOTHER_VAR=value -a <your-app-name>
  ```

## Cost Optimization

- **Machine Size**: `shared-cpu-1x` with `256mb` memory is a cost-effective option with dedicated IPv4.
- **Auto Stop/Start**: `auto_stop_machines = 'stop'` and `min_machines_running = 0` minimize costs during idle periods.
- **Regions**: Choose strategically; data transfer costs vary.
- **Bandwidth**: Monitor SSE bandwidth via the Fly.io dashboard. Fly.io offers a free bandwidth tier.
- **CDN**: Fly.io's built-in edge caching for static assets is generally sufficient. Next.js serves static assets (`.next/static`) from the Node.js server.

## Troubleshooting

- **Build Failures**: Check `fly deploy` output for `Dockerfile` or dependency issues.
- **Runtime Errors**: Inspect logs with `fly logs`.
- **Health Check Failures**: Ensure the app starts correctly and responds with HTTP 200 on the health check path (`/`) within the `timeout`.

This guide enables efficient and cost-effective deployment of Planeto on Fly.io.
