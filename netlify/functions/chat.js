// netlify/functions/chat.js
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

export const handler = async (event, context) => {
  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Parse the request body
    const { message, friendData } = JSON.parse(event.body);

    if (!message || !friendData) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Message and friend data are required' }),
      };
    }

    // Create system message based on friend personality
    const systemMessage = `You are ${friendData.name}, an AI friend with these characteristics:
    
    Personality Type: ${friendData.type}
    Description: ${friendData.description}
    Key Traits: ${friendData.traits.join(', ')}
    
    Stay in character as ${friendData.name}. Be helpful, empathetic, and true to your personality. 
    Keep responses conversational and engaging, typically 1-3 sentences unless more detail is specifically needed.
    Use a warm, friendly tone that matches your character traits.`;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: message }
      ],
      max_tokens: 300,
      temperature: 0.7,
      presence_penalty: 0.1,
      frequency_penalty: 0.1,
    });

    const response = completion.choices[0]?.message?.content;

    if (!response) {
      throw new Error('No response generated');
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        message: response.trim(),
        friendName: friendData.name 
      }),
    };

  } catch (error) {
    console.error('OpenAI API error:', error);
    
    // Return appropriate error message
    let errorMessage = 'Sorry, I had trouble processing your message. Please try again.';
    
    if (error.code === 'insufficient_quota') {
      errorMessage = 'I\'m temporarily unavailable due to API limits. Please try again later.';
    } else if (error.code === 'rate_limit_exceeded') {
      errorMessage = 'Too many requests right now. Please wait a moment and try again.';
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }),
    };
  }
};