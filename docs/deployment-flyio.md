# Deploying Planeto to Fly.io

This document provides a detailed guide for deploying the Planeto application to Fly.io, focusing on cost-effectiveness and best practices for a Next.js application with Server-Sent Events (SSE).

## Overview

We use Docker to containerize the application, and Fly.io to host and manage the container. The configuration aims for minimal resource usage when idle, scaling to a single small machine when active.

## Prerequisites

1.  **Fly.io Account**: Sign up at [fly.io](https://fly.io/).
2.  **`flyctl` CLI**: Install the Fly command-line tool. Instructions: [fly.io/docs/hands-on/install-flyctl/](https://fly.io/docs/hands-on/install-flyctl/).
3.  **Docker**: Ensure Docker is installed and running locally if you wish to build and test images locally (optional, Fly.io can build from the Dockerfile directly).
4.  **Project Files**: Ensure you have the `Dockerfile` and `fly.toml` (as configured in the repository) in your project root.

## Key Configuration Files

- `Dockerfile`: Defines the build process for the Next.js application, creating an optimized production image.
- `.dockerignore`: Specifies files and directories to exclude from the Docker build context, reducing image size and build time.
- `next.config.ts`: Configured with `output: 'standalone'` to produce a minimal server deployment.
- `fly.toml`: Fly.io application configuration file. Defines services, machine resources, health checks, and deployment settings.

## `fly.toml` Configuration Highlights

```toml
app = 'planeto' # Your chosen app name
primary_region = 'lhr' # Your chosen primary region

[build]
  # No specific build args here as Dockerfile is self-contained.
  # Fly will automatically use the Dockerfile.

[http_service]
internal_port = 3000      # Port your app listens on inside the container
force_https = true        # Redirect HTTP to HTTPS
auto_stop_machines = 'stop' # Stop machine(s) when idle (can be 'stop' or 'off')
auto_start_machines = true  # Start machine(s) on new requests
min_machines_running = 0    # Allow scaling down to zero machines
max_machines_running = 1  # Max number of machines (adjust for scaling)
processes = ['app']       # Corresponds to the process group in the Dockerfile (usually 'app')

[[vm]]
memory = '256mb'          # Smallest memory for dedicated IPv4
cpu_kind = 'shared'         # Use shared CPU for cost-effectiveness
cpus = 1                  # Number of CPUs

[[services]]
protocol = "tcp"
internal_port = 3000 # Port your app listens on (matches http_service.internal_port)
processes = ["app"]

  [[services.ports]]
  port = 80
  handlers = ["http"]
  force_https = true

  [[services.ports]]
  port = 443
  handlers = ["tls", "http"]

  # Health check to ensure the app is responsive
  [[services.http_checks]]
  interval = "10s"          # How often to check
  timeout = "2s"            # How long to wait for a response
  method = "GET"
  path = "/"                # Path for the health check
  grace_period = "5s"       # Time to allow app to start before first check

  # Concurrency settings (defaults are often fine for starting)
  # [services.concurrency]
  # type = "connections" # Can be 'connections' or 'requests'
  # hard_limit = 25      # Max concurrent connections/requests
  # soft_limit = 20      # Connections/requests before scaling (if max_machines_running > 1)
```

**Notes on `fly.toml`:**

- **`auto_stop_machines = 'stop'` and `min_machines_running = 0`**: These are key for cost savings. Your app will not consume resources when idle. `'stop'` means the VM is suspended and can resume quickly. `'off'` means it's terminated and will take longer to start.
- **`memory = '256mb'`**: This is the smallest tier that typically comes with a dedicated IPv4 address. If your app can run on less and you are comfortable with shared IPv4 or IPv6 only, you might explore smaller options, but 256MB is a safe start for Next.js.
- **SSE Considerations**: The default HTTP/2 proxying by Fly.io generally works well with SSE. The health check on `/` ensures the main app is responsive. If specific SSE endpoints need different handling (e.g., longer timeouts), that would require more advanced configuration.

## Deployment Steps

1.  **Log in to `flyctl`**:

    ```bash
    fly auth login
    ```

2.  **Initial Launch (if not done already)**:
    If this is the first time deploying this app to Fly.io under your account, or if `fly.toml` doesn't exist:

    ```bash
    fly launch
    ```

    - It will detect the `Dockerfile`.
    - **App Name**: Choose a unique name for your application (e.g., `planeto`). This will be part of its URL.
    - **Organization**: Select your Fly.io organization.
    - **Region**: Choose a region close to your users or yourself (e.g., `lhr` for London, `sjc` for San Jose).
    - **PostgreSQL Database**: Select **No**.
    - **Redis Database**: Select **No**.
    - **Deploy now?**: You can select **No** if you want to review `fly.toml` first. If you select **Yes**, it will attempt the first deployment.
      This command creates the `fly.toml` file if it doesn't exist and registers your app with Fly.io. The `fly.toml` in the repository is already configured, so this step might primarily be for app registration if the file is already present.

3.  **Deploy the Application**:
    From your project's root directory:

    ```bash
    fly deploy
    ```

    This command will:

    - Read `fly.toml`.
    - Build the Docker image (either locally if Docker is running or remotely on Fly.io's builders).
    - Push the image to Fly.io's registry.
    - Provision or update the machine(s) based on `fly.toml`.
    - Start your application.

4.  **Verify Deployment**:
    Once the deployment is complete, `flyctl` will output the URL of your application. You can also open it with:
    ```bash
    fly apps open -a <your-app-name>
    ```
    (Replace `<your-app-name>` with the name you chose).

## Managing the Application

- **View Logs**:
  ```bash
  fly logs -a <your-app-name>
  ```
- **Application Status**:
  ```bash
  fly status -a <your-app-name>
  ```
- **Scaling (Manual)**:
  To change the number of machines (if `max_machines_running` allows):
  ```bash
  fly scale count <number> -a <your-app-name>
  ```
  For the current cost-effective setup, `max_machines_running` is 1, so scaling beyond that requires adjusting `fly.toml`.
- **Secrets Management**:
  If your application needs environment variables (e.g., API keys):
  ```bash
  fly secrets set MY_VARIABLE=my_value ANOTHER_VARIABLE=another_value -a <your-app-name>
  ```
  These secrets are available as environment variables at runtime. The application will restart after secrets are set/updated.

## Cost Optimization Notes

- **Machine Size**: The `shared-cpu-1x` with `256mb` memory is one of the cheapest options that provides a dedicated IPv4.
- **Auto Stop/Start**: `auto_stop_machines = 'stop'` and `min_machines_running = 0` are crucial. Your app only runs (and incurs full compute costs) when receiving traffic.
- **Regions**: Data transfer costs can vary by region. Choose regions strategically.
- **Bandwidth**: Fly.io includes a generous free tier for bandwidth. SSE can consume more bandwidth than typical request-response APIs due to persistent connections. Monitor your usage via the Fly.io dashboard.
- **CDN for Static Assets**: Next.js's build output (`.next/static`) is served by the Node.js server in this setup. For very high traffic sites, you might consider offloading these to a dedicated CDN, but for many applications, Fly.io's built-in edge caching for static assets is sufficient and cost-effective. Fly.io's CDN will automatically cache cacheable static assets served by your app.

## Troubleshooting

- **Build Failures**: Check the output of `fly deploy`. Often, issues are related to the `Dockerfile` or missing dependencies.
- **Runtime Errors**: Use `fly logs` to inspect application logs.
- **Health Check Failures**: If your app doesn't become healthy, ensure it starts correctly and responds with HTTP 200 on the health check path (`/` in this configuration) within the specified `timeout`.

By following this guide, you should be able to deploy and run Planeto on Fly.io efficiently and cost-effectively.
