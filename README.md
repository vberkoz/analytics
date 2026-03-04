# Analytics Platform

Privacy-focused event tracking for landing pages.

## Deploy

```bash
chmod +x deploy.sh
./deploy.sh
```

## Usage

After deployment, update `landing/index.html` with the API URL from stack outputs, then redeploy:

```bash
aws s3 sync landing/ s3://BUCKET_NAME/ --profile basil
```

Embed tracking script in your landing pages:

```html
<script src="https://analytics.vberkoz.com/track.js"></script>
```

## Architecture

- **API Gateway** → POST /event, GET /query, GET/POST/DELETE /projects
- **Lambda (Node.js)** → Event collector, query handler, projects manager
- **DynamoDB** → Event storage (PK: project_id#date, SK: timestamp)
- **S3 + CloudFront** → Landing page + tracking script + dashboard
- **Cognito** → User authentication
