# NawkNawk Fly.io Deployment Guide

This guide will help you deploy your NawkNawk app to Fly.io.

## Prerequisites

1. **Fly.io Account**: Sign up at [fly.io](https://fly.io)
2. **Fly CLI**: Install the Fly CLI
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```
3. **Login to Fly.io**:
   ```bash
   fly auth login
   ```

## Quick Deployment

### Option 1: Using the deployment script (Recommended)

```bash
./deploy.sh
```

This script will:
- Check if Fly CLI is installed and you're logged in
- Build the application
- Deploy to Fly.io
- Show you the live URL

### Option 2: Manual deployment

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Deploy to Fly.io**:
   ```bash
   fly deploy
   ```

## Configuration

### App Name
The app is configured as `nawknawk` in `fly.toml`. If you want to change the name:

1. Edit `fly.toml` and change the `app = "nawknawk"` line
2. Or use a different name during deployment:
   ```bash
   fly deploy --app your-app-name
   ```

### Region
The app is configured to deploy to the `iad` (Washington DC) region. To change:

1. Edit `fly.toml` and change `primary_region = "iad"`
2. Or specify during deployment:
   ```bash
   fly deploy --region your-preferred-region
   ```

### Resources
The app is configured with:
- 1 CPU (shared)
- 512MB RAM
- Auto-scaling (0-1 machines)

To scale up:
```bash
fly scale count 2
fly scale memory 1024
```

## Monitoring

### View logs
```bash
fly logs
```

### Check status
```bash
fly status
```

### Monitor metrics
```bash
fly dashboard
```

## Environment Variables

The app uses these environment variables:
- `PORT`: Set to 3000 (configured in fly.toml)

To add custom environment variables:
```bash
fly secrets set MY_VAR=value
```

## Troubleshooting

### Build fails
- Check that all dependencies are in `package.json`
- Ensure the build script works locally: `npm run build`

### Deployment fails
- Check Fly.io status: `fly status`
- View logs: `fly logs`
- Ensure you're logged in: `fly auth whoami`

### App doesn't start
- Check the health endpoint: `curl https://your-app.fly.dev/health`
- View logs: `fly logs`
- Check resource usage: `fly status`

### WebSocket connection issues
- Ensure the app is using HTTPS in production
- Check that the socket server is running on the correct port
- Verify CORS settings in the server

## Scaling

### Horizontal scaling
```bash
fly scale count 3
```

### Vertical scaling
```bash
fly scale memory 1024
fly scale cpu 2
```

### Auto-scaling
The app is configured with auto-scaling enabled. It will:
- Start with 0 machines when no traffic
- Scale up to 1 machine when traffic arrives
- Scale down when traffic stops

## Custom Domains

To add a custom domain:

1. Add your domain in the Fly.io dashboard
2. Update your DNS records
3. Configure SSL certificates (automatic with Fly.io)

## Backup and Recovery

### Database (if added later)
```bash
# Create a volume for persistent data
fly volumes create nawknawk_data --size 10 --region iad

# Backup data
fly ssh console -C "pg_dump your_database > backup.sql"
```

## Cost Optimization

- The app uses auto-scaling to minimize costs
- Machines scale to 0 when not in use
- Shared CPU resources reduce costs
- Monitor usage in the Fly.io dashboard

## Security

- HTTPS is enforced automatically
- Health checks ensure app availability
- Non-root user in Docker container
- Environment variables for sensitive data

## Support

If you encounter issues:
1. Check the Fly.io documentation
2. View app logs: `fly logs`
3. Check Fly.io status page
4. Contact Fly.io support if needed 