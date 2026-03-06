# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Analytics Platform is a privacy-focused event tracking system for landing pages. It consists of:
- **Backend**: AWS Lambda functions (Node.js) for event collection, querying, and project management
- **Frontend**: Browser-based dashboard (HTML/CSS/JS) for analytics visualization
- **Tracking Script**: Client-side JavaScript embedded in user landing pages
- **Infrastructure**: AWS CloudFormation-managed resources (API Gateway, Lambda, DynamoDB, S3, CloudFront, Cognito)

## Architecture

### Data Model
- **DynamoDB Table** (`analytics-data`): Stores all events with composite keys
  - **Primary Key**: `PK` (project_id) + `SK` (timestamp/event)
  - **GSI1**: `GSI1PK` (project_id#date) + `GSI1SK` (timestamp) for date-range queries
  - Event attributes: event_type, path, referrer, visitor tracking, session data, UTM params, engagement metrics, geolocation, etc.

### Backend (Lambda Functions)
Three Node.js functions deployed via CloudFormation:

1. **Collector** (`api/index.mjs`): POST /event
   - Receives events from `track.js`
   - Enriches with CloudFront viewer country header
   - Stores in DynamoDB with computed PK/SK and GSI keys

2. **Query** (`api/query.mjs`): GET /query
   - Requires JWT authentication (parses from Authorization header)
   - Validates user owns the project (checks USER#userId → PROJECT#projectId mapping)
   - Queries events by date range using GSI1
   - Returns aggregated event data

3. **Projects** (`api/projects.mjs`): GET/POST/DELETE /projects
   - Manages user's projects (CRUD operations)
   - Stores as USER#userId → PROJECT#projectId with name and type
   - Projects function endpoint also supports individual project resource

### Frontend (Dashboard)
Dashboard splits functionality across modules (organized after commit 4554d41):
- **dashboard-core.js**: Core initialization, data loading, project selection, date range handling
- **dashboard-metrics.js**: Key metrics calculations (page views, bounce rate, avg session duration, etc.)
- **dashboard-charts.js**: Chart rendering (line, bar charts)
- **dashboard-tables.js**: Table visualizations (entry/exit pages, countries, search queries, engaging pages)
- **dashboard-projects.js**: Project management UI
- **auth.js**: Cognito authentication (login/register with idToken in localStorage)

API_URL hardcoded in `dashboard-core.js` (line 1) and `landing/track.js` (line 5).

### Tracking Script (`landing/track.js`)
Client-side script embedded as `<script src="https://analytics.vberkoz.com/track.js"></script>`:
- Supports `data-project` and `data-source` attributes
- Manages sessions: SESSION_TIMEOUT=30 min, VISITOR_EXPIRY=365 days (stored in localStorage/sessionStorage)
- Tracks page views, navigation depth, session duration, engagement metrics (scroll, interactions, active time)
- Parses UTM parameters and referrer for attribution

## Development Commands

### Deploy Full Stack
```bash
chmod +x deploy.sh
./deploy.sh
```
- Packages Lambda functions as ZIP files in api/
- Deploys CloudFormation stack (region: us-east-1, profile: basil)
- Updates Lambda function code
- Syncs landing page and dashboard to S3 buckets
- Invalidates CloudFront caches

**AWS Credentials**: Uses `--profile basil` AWS CLI profile. Ensure configured before deployment.

### Deploy Landing Page Only
```bash
aws s3 sync landing/ s3://BUCKET_NAME/ --profile basil --cache-control "no-cache"
```

### Deploy Dashboard Only
```bash
aws s3 sync dashboard/ s3://DASHBOARD_BUCKET/ --profile basil --cache-control "no-cache"
```

### Update Individual Lambda Function
```bash
# Collector
cd api && zip -q collector.zip index.mjs && cd ..
aws lambda update-function-code --function-name analytics-collector --zip-file fileb://api/collector.zip --region us-east-1 --profile basil

# Query
cd api && zip -q query.zip query.mjs && cd ..
aws lambda update-function-code --function-name analytics-query --zip-file fileb://api/query.zip --region us-east-1 --profile basil

# Projects
cd api && zip -q projects.zip projects.mjs && cd ..
aws lambda update-function-code --function-name analytics-projects --zip-file fileb://api/projects.zip --region us-east-1 --profile basil
```

### Invalidate CloudFront Cache
```bash
aws cloudformation describe-stacks --stack-name analytics --region us-east-1 --profile basil --query 'Stacks[0].Outputs' --output json
# Then use CloudFrontDistributionId from outputs:
aws cloudfront create-invalidation --distribution-id DISTRIBUTION_ID --paths "/*" --profile basil
```

### View Stack Status
```bash
aws cloudformation describe-stacks --stack-name analytics --region us-east-1 --profile basil --query 'Stacks[0].Outputs' --output json
```

## Key Files and Their Purposes

- **cloudformation.yaml**: Complete infrastructure definition (S3, CloudFront, DynamoDB, Lambda, API Gateway, Route53, Cognito)
- **deploy.sh**: Orchestrates packaging and deployment
- **landing/track.js**: Tracking script—check API_URL and data attribute handling here
- **dashboard/dashboard-core.js**: Main entry point—check API_URL, date initialization, project loading here
- **dashboard/index.html**: Dashboard UI structure and modal definitions
- **api/index.mjs**: Event collection—review attribute mapping to DynamoDB items
- **api/query.mjs**: Query handler—JWT validation and permission checks
- **api/projects.mjs**: Project management logic

## Important Configurations

- **API Gateway URL** (`API_URL`): Defined in `dashboard-core.js:1` and `landing/track.js:5`
  - Must match API Gateway endpoint from CloudFormation stack outputs
  - Update after stack creation

- **Cognito Integration**: Dashboard uses Cognito for user authentication
  - idToken stored in localStorage
  - User ID extracted from JWT `sub` claim in Query/Projects handlers

- **AWS Region**: Hardcoded to `us-east-1` in deploy.sh and CloudFormation

- **AWS Profile**: Hardcoded to `basil` in deploy.sh

- **Domain Parameters** (cloudformation.yaml): LandingDomain, DashboardDomain, HostedZoneId
  - Defaults: analytics.vberkoz.com, dashboard.analytics.vberkoz.com, Z0938756375Q47T4PTZG2

## Common Development Patterns

### Adding a New Event Attribute
1. Update tracking script to capture and send data: `landing/track.js`
2. Add to DynamoDB item in Collector: `api/index.mjs` (PutItemCommand Item object)
3. Update Query handler if filtering needed: `api/query.mjs`
4. Update dashboard visualization: `dashboard/dashboard-*.js` modules

### Modifying Dashboard Visualization
- Charts: `dashboard/dashboard-charts.js`
- Metrics: `dashboard/dashboard-metrics.js`
- Tables: `dashboard/dashboard-tables.js`
- Data flow: Core loads data → Metrics calculates values → Charts/Tables render

### Adding Authentication to Endpoints
- Parse JWT from `Authorization: Bearer <token>` header
- Extract `sub` claim for user ID (see `api/query.mjs` for example)
- Validate user owns resource by querying `USER#userId → PROJECT#projectId` mapping

## Project Dependencies

- **AWS SDK**: `@aws-sdk/client-dynamodb` for DynamoDB operations, `@aws-sdk/client-lambda` usage in deployment
- **Runtime**: Node.js 24.x (Lambda runtime defined in CloudFormation)
- **Frontend**: Vanilla JavaScript, no build system or dependencies

## Recent Changes

Recent commits show active feature development:
- Dashboard refactoring: Split monolithic `dashboard.js` into focused modules (metrics, charts, tables, projects, core)
- Engagement tracking: Added journey depth, pages visited, session duration, content engagement metrics
- Growth tracking: New vs returning users growth metrics
- UI improvements: Dropdown styling, consistency updates

See git history for migration guide if modifying dashboard architecture.
