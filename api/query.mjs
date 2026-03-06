import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({});
const tableName = process.env.TABLE_NAME;

function parseJwt(token) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(Buffer.from(base64, 'base64').toString());
}

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  };

  const token = event.headers?.Authorization?.replace('Bearer ', '');
  if (!token) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  let userId;
  try {
    const payload = parseJwt(token);
    userId = payload.sub;
  } catch {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid token' }) };
  }

  const { project_id, start, end } = event.queryStringParameters || {};

  if (!project_id) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'project_id required' }) };
  }

  // Verify user owns project
  const projectCheck = await client.send(new QueryCommand({
    TableName: tableName,
    KeyConditionExpression: 'PK = :pk AND SK = :sk',
    ExpressionAttributeValues: {
      ':pk': { S: `USER#${userId}` },
      ':sk': { S: `PROJECT#${project_id}` },
    },
  }));

  if (!projectCheck.Items || projectCheck.Items.length === 0) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Access denied' }) };
  }

  const startDate = start ? new Date(start) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const endDate = end ? new Date(end) : new Date();
  const allEvents = [];

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];

    const result = await client.send(new QueryCommand({
      TableName: tableName,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: { ':pk': { S: `PROJECT#${project_id}#${dateStr}` } },
    }));

    for (const item of result.Items || []) {
      allEvents.push({
        sk: item.GSI1SK.S,
        event_type: item.event_type.S,
        path: item.path.S,
        referrer: item.referrer?.S || '',
        screen: item.screen.S,
        session_id: item.session_id?.S || '',
        visitor_id: item.visitor_id?.S || '',
        is_returning: item.is_returning?.BOOL || false,
        session_duration: item.session_duration?.N || '0',
        utm_source: item.utm_source?.S || '',
        utm_medium: item.utm_medium?.S || '',
        utm_campaign: item.utm_campaign?.S || '',
        utm_term: item.utm_term?.S || '',
        utm_content: item.utm_content?.S || '',
        landing_page: item.landing_page?.S || '',
        country: item.country?.S || 'XX',
        search_query: item.search_query?.S || '',
        search_results_count: item.search_results_count?.N || '0',
        is_entry: item.is_entry?.BOOL || false,
        total_time: item.total_time?.N || '0',
        active_time: item.active_time?.N || '0',
        engagement_rate: item.engagement_rate?.N || '0',
        max_scroll: item.max_scroll?.N || '0',
        interactions: item.interactions?.N || '0',
      });
    }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ events: allEvents }),
  };
};
