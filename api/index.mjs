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
      journey_depth: { N: String(body.journey_depth || 0) },
      prev_path: { S: body.prev_path || '' },
      pages_visited: { N: String(body.pages_visited || 0) },
      utm_source: { S: body.utm_source || '' },
      utm_medium: { S: body.utm_medium || '' },
      utm_campaign: { S: body.utm_campaign || '' },
      utm_term: { S: body.utm_term || '' },
      utm_content: { S: body.utm_content || '' },
      landing_page: { S: body.landing_page || '' },
    },
  }));

  return { statusCode: 204, headers };
};
