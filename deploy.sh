#!/usr/bin/env bash
# Deploy campus-pulse Lambda + API Gateway.
# Run from the project root: bash deploy.sh
set -euo pipefail

FUNCTION_NAME="campus-pulse-api"
API_NAME="campus-pulse"
REGION="us-west-2"

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# ── 1. IAM role ────────────────────────────────────────────────────────────────
# Paste your role ARN here after creating the role manually in the AWS console.
# IAM → Roles → Create role → Lambda → attach AmazonDynamoDBReadOnlyAccess
#   + AWSLambdaBasicExecutionRole → name it "campus-pulse-lambda-role"
ROLE_ARN="arn:aws:iam::310830245237:role/campus-pulse-lambda-role"

if [ "$ROLE_ARN" = "PASTE_ROLE_ARN_HERE" ]; then
  echo "ERROR: Set ROLE_ARN in deploy.sh first."
  echo "Create the role in IAM console, then paste its ARN into deploy.sh."
  exit 1
fi
echo "→ Using role: $ROLE_ARN"

# ── 2. Package ─────────────────────────────────────────────────────────────────
echo "→ Packaging..."
rm -f /tmp/campus-pulse-lambda.zip
zip -j /tmp/campus-pulse-lambda.zip \
  ../lambda/lambda_function.py \
  config.py
echo "  Packaged lambda_function.py + config.py"

# ── 3. Lambda function ─────────────────────────────────────────────────────────
echo "→ Lambda function..."
if aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" > /dev/null 2>&1; then
  aws lambda update-function-code \
    --function-name "$FUNCTION_NAME" \
    --zip-file fileb:///tmp/campus-pulse-lambda.zip \
    --region "$REGION" > /dev/null
  echo "  Updated $FUNCTION_NAME"
else
  aws lambda create-function \
    --function-name "$FUNCTION_NAME" \
    --runtime python3.12 \
    --role "$ROLE_ARN" \
    --handler lambda_function.lambda_handler \
    --zip-file fileb:///tmp/campus-pulse-lambda.zip \
    --timeout 30 \
    --region "$REGION" > /dev/null
  echo "  Created $FUNCTION_NAME"
fi

# ── 4. API Gateway (HTTP API) ──────────────────────────────────────────────────
echo "→ API Gateway..."
API_ID=$(aws apigatewayv2 get-apis --region "$REGION" \
  --query "Items[?Name=='$API_NAME'].ApiId" --output text)

if [ -z "$API_ID" ]; then
  API_ID=$(aws apigatewayv2 create-api \
    --name "$API_NAME" \
    --protocol-type HTTP \
    --cors-configuration 'AllowOrigins=["*"],AllowMethods=["GET"],AllowHeaders=["Content-Type"]' \
    --region "$REGION" \
    --query ApiId --output text)
  echo "  Created API: $API_ID"
else
  echo "  API exists: $API_ID"
fi

# ── 5. Integration ─────────────────────────────────────────────────────────────
LAMBDA_ARN="arn:aws:lambda:$REGION:$ACCOUNT_ID:function:$FUNCTION_NAME"
INTEGRATION_ID=$(aws apigatewayv2 get-integrations --api-id "$API_ID" --region "$REGION" \
  --query "Items[0].IntegrationId" --output text 2>/dev/null || true)

if [ -z "$INTEGRATION_ID" ] || [ "$INTEGRATION_ID" = "None" ]; then
  INTEGRATION_ID=$(aws apigatewayv2 create-integration \
    --api-id "$API_ID" \
    --integration-type AWS_PROXY \
    --integration-uri "$LAMBDA_ARN" \
    --payload-format-version "2.0" \
    --region "$REGION" \
    --query IntegrationId --output text)
  echo "  Created integration: $INTEGRATION_ID"
fi

# ── 6. Route GET /buildings ────────────────────────────────────────────────────
ROUTE_EXISTS=$(aws apigatewayv2 get-routes --api-id "$API_ID" --region "$REGION" \
  --query "Items[?RouteKey=='GET /buildings'].RouteId" --output text)

if [ -z "$ROUTE_EXISTS" ]; then
  aws apigatewayv2 create-route \
    --api-id "$API_ID" \
    --route-key "GET /buildings" \
    --target "integrations/$INTEGRATION_ID" \
    --region "$REGION" > /dev/null
  echo "  Created route GET /buildings"
fi

# ── 7. Default stage with auto-deploy ─────────────────────────────────────────
aws apigatewayv2 create-stage \
  --api-id "$API_ID" \
  --stage-name '$default' \
  --auto-deploy \
  --region "$REGION" > /dev/null 2>&1 || true

# ── 8. Grant API Gateway permission to invoke Lambda ──────────────────────────
aws lambda add-permission \
  --function-name "$FUNCTION_NAME" \
  --statement-id "apigw-invoke" \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:$REGION:$ACCOUNT_ID:$API_ID/*/*" \
  --region "$REGION" > /dev/null 2>&1 || true

# ── 9. S3 static website hosting ──────────────────────────────────────────────
API_URL="https://$API_ID.execute-api.$REGION.amazonaws.com/buildings"
BUCKET="campus-pulse-$ACCOUNT_ID"

echo "→ Frontend..."

# Create bucket if it doesn't exist
if ! aws s3api head-bucket --bucket "$BUCKET" --region "$REGION" 2>/dev/null; then
  aws s3api create-bucket \
    --bucket "$BUCKET" \
    --region "$REGION" \
    --create-bucket-configuration LocationConstraint="$REGION" > /dev/null
  echo "  Created bucket: $BUCKET"
fi

# Disable block public access
aws s3api put-public-access-block \
  --bucket "$BUCKET" \
  --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false" \
  --region "$REGION"

# Enable static website hosting
aws s3api put-bucket-website \
  --bucket "$BUCKET" \
  --website-configuration '{"IndexDocument":{"Suffix":"index.html"},"ErrorDocument":{"Key":"index.html"}}' \
  --region "$REGION"

# Set public read bucket policy
aws s3api put-bucket-policy --bucket "$BUCKET" --policy "{
  \"Version\": \"2012-10-17\",
  \"Statement\": [{
    \"Effect\": \"Allow\",
    \"Principal\": \"*\",
    \"Action\": \"s3:GetObject\",
    \"Resource\": \"arn:aws:s3:::$BUCKET/*\"
  }]
}" --region "$REGION"

# Build frontend pointing at the real API
echo "VITE_API_URL=$API_URL" > .env.local
npm run build

# Upload dist/ to S3
aws s3 sync dist/ "s3://$BUCKET" --delete --region "$REGION" > /dev/null
echo "  Uploaded dist/ to s3://$BUCKET"

SITE_URL="http://$BUCKET.s3-website-$REGION.amazonaws.com"

# ── Done ───────────────────────────────────────────────────────────────────────
echo ""
echo "✓ Fully deployed!"
echo ""
echo "  Website:  $SITE_URL"
echo "  API:      $API_URL"
