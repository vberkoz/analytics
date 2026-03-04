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
    },
  }));

  return { statusCode: 204, headers };
};
