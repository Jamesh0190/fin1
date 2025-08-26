export async function handler(event, context) {
  return {
    statusCode: 200,
    body: JSON.stringify({ status: 'OK', timestamp: new Date().toISOString() })
  };
}