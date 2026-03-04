import { DynamoDBClient, QueryCommand, PutItemCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';

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
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
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

  if (event.httpMethod === 'GET') {
    const result = await client.send(new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': { S: `USER#${userId}` },
        ':sk': { S: 'PROJECT#' },
      },
    }));

    const projects = (result.Items || []).map(item => ({
      projectId: item.SK.S.replace('PROJECT#', ''),
      name: item.name.S,
      type: item.type?.S || 'landing',
    }));

    return { statusCode: 200, headers, body: JSON.stringify({ projects }) };
  }

  if (event.httpMethod === 'POST') {
    const { projectId, name, type } = JSON.parse(event.body);

    if (!type || !['landing', 'multipage', 'webapp'].includes(type)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Project type required: landing, multipage, or webapp' }) };
    }

    await client.send(new PutItemCommand({
      TableName: tableName,
      Item: {
        PK: { S: `USER#${userId}` },
        SK: { S: `PROJECT#${projectId}` },
        name: { S: name },
        type: { S: type },
      },
    }));

    return { statusCode: 201, headers, body: JSON.stringify({ projectId, name, type }) };
  }

  if (event.httpMethod === 'DELETE') {
    const projectId = event.pathParameters?.projectId;
    if (!projectId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Project ID required' }) };
    }

    // Delete project metadata
    await client.send(new DeleteItemCommand({
      TableName: tableName,
      Key: {
        PK: { S: `USER#${userId}` },
        SK: { S: `PROJECT#${projectId}` },
      },
    }));

    // Delete analytics events - query all dates
    let lastKey;
    do {
      const result = await client.send(new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: { ':pk': { S: `PROJECT#${projectId}` } },
        ExclusiveStartKey: lastKey,
      }));

      if (result.Items?.length) {
        await Promise.all(result.Items.map(item =>
          client.send(new DeleteItemCommand({
            TableName: tableName,
            Key: { PK: item.PK, SK: item.SK },
          }))
        ));
      }

      lastKey = result.LastEvaluatedKey;
    } while (lastKey);

    return { statusCode: 204, headers };
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
};
