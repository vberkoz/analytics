#!/bin/bash

set -e

export AWS_PAGER=""

STACK_NAME="analytics"
REGION="us-east-1"
PROFILE="basil"
ROOT_DIR=$(pwd)

echo "Packaging Lambda functions..."
cd api
zip -q collector.zip index.mjs
zip -q query.zip query.mjs
zip -q projects.zip projects.mjs
cd ..

echo "Deploying CloudFormation stack..."
aws cloudformation deploy \
  --template-file ${ROOT_DIR}/cloudformation.yaml \
  --stack-name ${STACK_NAME} \
  --capabilities CAPABILITY_IAM \
  --region ${REGION} \
  --profile ${PROFILE}

echo "Updating Lambda functions..."
aws lambda update-function-code \
  --function-name ${STACK_NAME}-collector \
  --zip-file fileb://api/collector.zip \
  --region ${REGION} \
  --profile ${PROFILE} \
  --query 'LastUpdateStatus' \
  --output text

aws lambda update-function-code \
  --function-name ${STACK_NAME}-query \
  --zip-file fileb://api/query.zip \
  --region ${REGION} \
  --profile ${PROFILE} \
  --query 'LastUpdateStatus' \
  --output text

aws lambda update-function-code \
  --function-name ${STACK_NAME}-projects \
  --zip-file fileb://api/projects.zip \
  --region ${REGION} \
  --profile ${PROFILE} \
  --query 'LastUpdateStatus' \
  --output text 2>/dev/null || echo "Projects function not yet created"

echo "Waiting for Lambda update..."
aws lambda wait function-updated \
  --function-name ${STACK_NAME}-collector \
  --region ${REGION} \
  --profile ${PROFILE}

echo "Getting stack outputs..."
WEBSITE_BUCKET=$(aws cloudformation describe-stacks --stack-name ${STACK_NAME} --region ${REGION} --profile ${PROFILE} --query 'Stacks[0].Outputs[?OutputKey==`WebsiteBucketName`].OutputValue' --output text)
CLOUDFRONT_ID=$(aws cloudformation describe-stacks --stack-name ${STACK_NAME} --region ${REGION} --profile ${PROFILE} --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' --output text)
DASHBOARD_BUCKET=$(aws cloudformation describe-stacks --stack-name ${STACK_NAME} --region ${REGION} --profile ${PROFILE} --query 'Stacks[0].Outputs[?OutputKey==`DashboardBucketName`].OutputValue' --output text 2>/dev/null || echo "")
DASHBOARD_CF_ID=$(aws cloudformation describe-stacks --stack-name ${STACK_NAME} --region ${REGION} --profile ${PROFILE} --query 'Stacks[0].Outputs[?OutputKey==`DashboardDistributionId`].OutputValue' --output text 2>/dev/null || echo "")

echo "Deploying landing page to S3..."
aws s3 sync ${ROOT_DIR}/landing/ s3://${WEBSITE_BUCKET}/ --profile ${PROFILE} --cache-control "no-cache"

if [ -n "$DASHBOARD_BUCKET" ]; then
  echo "Deploying dashboard to S3..."
  aws s3 sync ${ROOT_DIR}/dashboard/ s3://${DASHBOARD_BUCKET}/ --profile ${PROFILE} --cache-control "no-cache"
fi

echo "Invalidating CloudFront cache..."
aws cloudfront create-invalidation --distribution-id ${CLOUDFRONT_ID} --paths "/*" --profile ${PROFILE} --query 'Invalidation.Id' --output text

if [ -n "$DASHBOARD_CF_ID" ]; then
  echo "Invalidating dashboard CloudFront cache..."
  aws cloudfront create-invalidation --distribution-id ${DASHBOARD_CF_ID} --paths "/*" --profile ${PROFILE} --query 'Invalidation.Id' --output text
fi

echo "Deployment complete!"
aws cloudformation describe-stacks --stack-name ${STACK_NAME} --region ${REGION} --profile ${PROFILE} --query 'Stacks[0].Outputs' --output json
