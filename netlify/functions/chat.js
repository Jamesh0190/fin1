// netlify/functions/chat.js - Enhanced with multiple AI providers and robust error handling

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Provider, X-API-Key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

// Rate limiting in memory (in production, use Redis or similar)
const rateLimitStore = new Map();
const RATE_LIMIT = 10; // requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(clientId) {
  const now = Date.now();
  const clientData = rateLimitStore.get(clientId) || { count: 0, resetTime: now + RATE_WINDOW };
  
  if (now > clientData.resetTime) {
    clientData.count = 0;
    clientData.resetTime = now + RATE_WINDOW;
  }
  
  if (clientData.count >= RATE_LIMIT) {
    return false;
  }
  
  clientData.count++;
  rateLimitStore.set(clientId, clientData);
  return true;
}

async function callOpenAI(messages, apiKey, model = 'gpt-3.5-turbo') {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      max_tokens: 500,
      temperature: 0.7,
      presence_penalty: 0.1,
      frequency_penalty: 0.1,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || 'I apologize, but I couldn\'t generate a response. Please try again.';
}

async function callAnthropic(messages, apiKey, model = 'claude-3-haiku-20240307') {
  // Convert OpenAI format to Anthropic format
  const systemMessage = messages.find(m => m.role === 'system');
  const conversationMessages = messages.filter(m => m.role !== 'system');
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: model,
      max_tokens: 500,
      system: systemMessage?.content || 'You are a helpful AI assistant.',
      messages: conversationMessages,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(`Anthropic API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.content[0]?.text || 'I apologize, but I couldn\'t generate a response. Please try again.';
}

async function callGemini(messages, apiKey, model = 'gemini-pro') {
  // Convert messages to Gemini format
  const contents = messages.filter(m => m.role !== 'system').map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));

  const systemInstruction = messages.find(m => m.role === 'system')?.content || 'You are a helpful AI assistant.';

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: contents,
      systemInstruction: { parts: [{ text: systemInstruction }] },
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500,
      }
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'I apologize, but I couldn\'t generate a response. Please try again.';
}

export const handler = async (event, context) => {
  const startTime = Date.now();
  console.log('🚀 Chat function invoked');

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Parse request
    const { message, friendData, history = [], provider = 'openai', model } = JSON.parse(event.body);

    // Validation
    if (!message?.trim() || !friendData) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Message and friend data are required' }),
      };
    }

    // Rate limiting
    const clientId = event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'unknown';
    if (!checkRateLimit(clientId)) {
      return {
        statusCode: 429,
        headers: CORS_HEADERS,
        body: JSON.stringify({ 
          error: 'Too many requests. Please wait a moment before sending another message.',
          retryAfter: 60
        }),
      };
    }

    // Get API key from headers or environment
    const apiKey = event.headers['x-api-key'] || 
                   process.env.OPENAI_API_KEY || 
                   process.env.ANTHROPIC_API_KEY || 
                   process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error('❌ No API key found');
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ 
          error: 'AI service is temporarily unavailable. Please try again later.' 
        }),
      };
    }

    // Build conversation context
    const systemMessage = `You are ${friendData.name}, an AI friend with these characteristics:

Personality Type: ${friendData.type}
Description: ${friendData.description}
Key Traits: ${friendData.traits ? friendData.traits.join(', ') : 'Helpful, Friendly'}
Specialty: ${friendData.specialty || 'General support and conversation'}

IMPORTANT INSTRUCTIONS:
- Stay in character as ${friendData.name} at all times
- Use a warm, conversational, and empathetic tone
- Keep responses engaging and typically 1-3 sentences unless more detail is specifically needed
- Show genuine interest in the user's wellbeing
- Use emojis sparingly but effectively to convey emotion
- If the user seems distressed, prioritize emotional support
- Provide practical, actionable advice when appropriate
- Remember you are a supportive friend, not a therapist or medical professional

Your goal is to be the perfect ${friendData.type} companion that users can rely on for ${friendData.specialty}.`;

    // Prepare messages for API
    const messages = [
      { role: 'system', content: systemMessage },
      ...history.slice(-10), // Keep last 10 messages for context
      { role: 'user', content: message.trim() }
    ];

    console.log(`📡 Calling ${provider} API...`);

    let aiResponse;
    const selectedModel = model || (provider === 'openai' ? 'gpt-3.5-turbo' : 
                                   provider === 'anthropic' ? 'claude-3-haiku-20240307' : 
                                   'gemini-pro');

    // Call appropriate AI service
    switch (provider.toLowerCase()) {
      case 'openai':
        aiResponse = await callOpenAI(messages, apiKey, selectedModel);
        break;
      case 'anthropic':
        aiResponse = await callAnthropic(messages, apiKey, selectedModel);
        break;
      case 'gemini':
        aiResponse = await callGemini(messages, apiKey, selectedModel);
        break;
      default:
        throw new Error(`Unsupported AI provider: ${provider}`);
    }

    const responseTime = Date.now() - startTime;
    console.log(`✅ Response generated in ${responseTime}ms`);

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        message: aiResponse.trim(),
        friendName: friendData.name,
        provider: provider,
        model: selectedModel,
        responseTime: responseTime
      }),
    };

  } catch (error) {
    console.error('❌ Error in chat function:', error);

    let statusCode = 500;
    let errorMessage = 'I\'m having trouble connecting right now. Please try again in a moment! 😊';

    // Handle specific error types
    if (error.message.includes('rate limit') || error.message.includes('429')) {
      statusCode = 429;
      errorMessage = 'I\'m getting too many requests right now. Please wait a moment and try again! ⏰';
    } else if (error.message.includes('quota') || error.message.includes('billing')) {
      statusCode = 503;
      errorMessage = 'AI services are temporarily limited. Please try again later or contact support.';
    } else if (error.message.includes('timeout')) {
      statusCode = 504;
      errorMessage = 'Request timed out. Please try again with a shorter message.';
    } else if (error.message.includes('API key') || error.message.includes('authentication')) {
      statusCode = 503;
      errorMessage = 'AI services are temporarily unavailable. Please try again later.';
    } else if (error.message.includes('content') || error.message.includes('policy')) {
      statusCode = 400;
      errorMessage = 'I can\'t respond to that type of message. Let\'s talk about something else! 😊';
    }

    return {
      statusCode: statusCode,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        error: errorMessage,
        code: error.code || 'UNKNOWN_ERROR',
        timestamp: new Date().toISOString(),
        requestId: context.awsRequestId
      }),
    };
  }
};