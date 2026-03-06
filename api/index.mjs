import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({});
const tableName = process.env.TABLE_NAME;

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  const body = JSON.parse(event.body);
  const country = event.headers?.['CloudFront-Viewer-Country'] || 'XX';
  const date = new Date(body.timestamp).toISOString().split('T')[0];
  const PK = `PROJECT#${body.project_id}`;
  const SK = `EVENT#${date}#${body.timestamp}`;

  await client.send(new PutItemCommand({
    TableName: tableName,
    Item: {
      PK: { S: PK },
      SK: { S: SK },
      GSI1PK: { S: `PROJECT#${body.project_id}#${date}` },
      GSI1SK: { S: `${body.timestamp}` },
      event_type: { S: body.event_type },
      path: { S: body.path },
      referrer: { S: body.referrer || '' },
      screen: { S: body.screen },
      session_id: { S: body.session_id || '' },
      visitor_id: { S: body.visitor_id || '' },
      is_returning: { BOOL: body.is_returning || false },
      journey_depth: { N: String(body.journey_depth || 0) },
      prev_path: { S: body.prev_path || '' },
      pages_visited: { N: String(body.pages_visited || 0) },
      session_duration: { N: String(body.session_duration || 0) },
      utm_source: { S: body.utm_source || '' },
      utm_medium: { S: body.utm_medium || '' },
      utm_campaign: { S: body.utm_campaign || '' },
      utm_term: { S: body.utm_term || '' },
      utm_content: { S: body.utm_content || '' },
      landing_page: { S: body.landing_page || '' },
      country: { S: country },
      search_query: { S: body.search_query || '' },
      search_results_count: { N: String(body.search_results_count || 0) },
      is_entry: { BOOL: body.is_entry || false },
      total_time: { N: String(body.total_time || 0) },
      active_time: { N: String(body.active_time || 0) },
      engagement_rate: { N: String(body.engagement_rate || 0) },
      max_scroll: { N: String(body.max_scroll || 0) },
      interactions: { N: String(body.interactions || 0) },
    },
  }));

  return { statusCode: 204, headers };
};
