import express from 'express';
import serverless from 'serverless-http';
import cors from 'cors';
import dotenv from 'dotenv';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { OpenAI } from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// Rate limiting
const rateLimiter = new RateLimiterMemory({
  points: parseInt(process.env.RATE_LIMIT_RPM) || 10,
  duration: 60, // 1 minute
});

// Middleware for rate limiting
const rateLimitMiddleware = async (req, res, next) => {
  try {
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    await rateLimiter.consume(clientIP);
    next();
  } catch (rejRes) {
    res.status(429).json({ error: 'Too many requests' });
  }
};

app.use(rateLimitMiddleware);

// Initialize AI clients
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/chat', async (req, res) => {
  try {
    const { message, provider, apiKey, character } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    let response;
    const userApiKey = apiKey || process.env[`${provider.toUpperCase()}_API_KEY`];

    switch (provider) {
      case 'openai':
        response = await handleOpenAI(message, userApiKey, character);
        break;
      case 'anthropic':
        response = await handleAnthropic(message, userApiKey, character);
        break;
      case 'gemini':
        response = await handleGemini(message, userApiKey, character);
        break;
      default:
        return res.status(400).json({ error: 'Invalid provider' });
    }

    res.json({ response });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

async function handleOpenAI(message, apiKey, character) {
  const openaiClient = new OpenAI({ apiKey });
  const completion = await openaiClient.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: character || "You are a helpful and empathetic AI friend." },
      { role: "user", content: message }
    ],
    max_tokens: 500,
    temperature: 0.7
  });
  return completion.choices[0].message.content;
}

async function handleAnthropic(message, apiKey, character) {
  const anthropicClient = new Anthropic({ apiKey });
  const msg = await anthropicClient.messages.create({
    model: "claude-3-sonnet-20240229",
    max_tokens: 500,
    temperature: 0.7,
    system: character || "You are a helpful and empathetic AI friend.",
    messages: [{ role: "user", content: message }]
  });
  return msg.content[0].text;
}

async function handleGemini(message, apiKey, character) {
  const genAIClient = new GoogleGenerativeAI(apiKey);
  const model = genAIClient.getGenerativeModel({ 
    model: "gemini-pro",
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 500,
    },
    systemInstruction: character || "You are a helpful and empathetic AI friend."
  });
  const result = await model.generateContent(message);
  return result.response.text();
}

export const handler = serverless(app);