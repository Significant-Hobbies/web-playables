import Anthropic from '@anthropic-ai/sdk';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateText, jsonSchema, NoObjectGeneratedError, Output } from 'ai';
import { Hono } from 'hono';
import { createWorkersAI } from 'workers-ai-provider';

import {
  buildAdvisorPrompt,
  buildDiplomacyPrompt,
  buildGameMasterPrompt,
} from '../../../lib/ai-prompts';
import { LLMTimeoutError, withTimeout } from '../../../lib/llm-timeout';
import { callLocalAI } from '../../../lib/local-ai';
import { getClientIp, rateLimit } from '../../../lib/rate-limit';
import { parseAiTurnResponse } from '../../../lib/turn-parser';
import { reserveWorkersAiCall, SharedAiBudgetError } from '../shared-ai-budget';
import type { WorkerEnv } from '../../../lib/worker-env';
import { resolveWorkersAiModel } from '../../../lib/workers-ai-model';
import type { Provider } from '../../../lib/types';

const SUPPORTED_PROVIDERS = new Set<Provider>([
  'local',
  'free-ai',
  'google',
  'openai',
  'anthropic',
  'deepseek',
]);

const hasUnsupportedProvider = (provider: unknown) =>
  typeof provider === 'string' && !SUPPORTED_PROVIDERS.has(provider as Provider);

const DEFAULT_GEMINI_MODEL = 'gemini-3-flash-preview';
const FALLBACK_GEMINI_MODELS = [
  'gemini-3-flash-preview',
  'gemini-2.5-flash',
  'gemini-flash-latest',
];

const normalizeGeminiModel = (model: string | undefined) => {
  if (!model) return DEFAULT_GEMINI_MODEL;
  const trimmed = model.trim();
  if (!trimmed) return DEFAULT_GEMINI_MODEL;
  return trimmed.startsWith('models/') ? trimmed.slice('models/'.length) : trimmed;
};

const normalizeFreeAiModel = (model: string | undefined) => {
  const trimmed = model?.trim();
  const configured = process.env.AI_MODEL?.trim();
  if (!trimmed || trimmed === 'auto') {
    if (!configured) throw new Error('AI_MODEL is required for the direct free provider');
    return configured;
  }
  return trimmed;
};

function createFreeAiGatewayModel(binding: Fetcher) {
  const provider = createOpenAICompatible({
    name: 'free-ai',
    baseURL: 'https://fleet-gateway.internal/v1',
    apiKey: 'service-binding',
    headers: { 'x-gateway-project-id': 'open-historia' },
    fetch: (input, init) => binding.fetch(new Request(input, init)),
    supportsStructuredOutputs: false,
  });
  return provider.chatModel('auto');
}

export function selectFreeAiGatewayModel(
  binding: Fetcher | undefined,
  nodeEnv: string | undefined
) {
  if (binding) return createFreeAiGatewayModel(binding);
  if ((nodeEnv ?? process.env.NODE_ENV) === 'production') {
    throw new Error('Free AI gateway service binding is required in production');
  }
  return null;
}

async function callOpenAICompatible({
  name,
  baseURL,
  apiKey,
  model,
  prompt,
}: {
  name: string;
  baseURL: string;
  apiKey: string;
  model: string;
  prompt: string;
}): Promise<string> {
  const provider = createOpenAICompatible({ name, baseURL, apiKey });
  const result = await generateText({
    model: provider.chatModel(model),
    prompt,
    maxRetries: 0,
  });
  return result.text || '{}';
}

const isModelSelectionError = (error: unknown) => {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  return (
    message.includes('not found') ||
    message.includes('unsupported') ||
    message.includes('invalid model') ||
    message.includes('404')
  );
};

type DiplomacyTone = 'friendly' | 'neutral' | 'hostile' | 'threatening';

interface DiplomacyResponse {
  message: string;
  tone: DiplomacyTone;
  relationChange: { newType: string; reason: string } | null;
}

const VALID_TONES: DiplomacyTone[] = ['friendly', 'neutral', 'hostile', 'threatening'];

const sanitizeDiplomacyResponse = (raw: unknown): DiplomacyResponse => {
  const payload = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  const message =
    typeof payload.message === 'string' && payload.message.trim()
      ? payload.message.trim()
      : '... *The envoy delivers an unintelligible response.*';

  const tone: DiplomacyTone =
    typeof payload.tone === 'string' && VALID_TONES.includes(payload.tone as DiplomacyTone)
      ? (payload.tone as DiplomacyTone)
      : 'neutral';

  let relationChange: DiplomacyResponse['relationChange'] = null;
  if (payload.relationChange && typeof payload.relationChange === 'object') {
    const rc = payload.relationChange as Record<string, unknown>;
    if (typeof rc.newType === 'string' && typeof rc.reason === 'string') {
      relationChange = {
        newType: rc.newType.trim(),
        reason: rc.reason.trim(),
      };
    }
  }

  return { message, tone, relationChange };
};

type AdvisorCategory = 'military' | 'diplomacy' | 'economy' | 'domestic' | 'general';

interface AdvisorResponse {
  advice: string;
  category: AdvisorCategory;
  suggestedActions: string[];
}

const VALID_CATEGORIES: AdvisorCategory[] = [
  'military',
  'diplomacy',
  'economy',
  'domestic',
  'general',
];

const sanitizeAdvisorResponse = (raw: unknown): AdvisorResponse => {
  const payload = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  const advice =
    typeof payload.advice === 'string' && payload.advice.trim()
      ? payload.advice.trim()
      : 'My liege, I must confess that the situation confounds even my years of experience. Allow me a moment to gather my thoughts and consult the archives.';

  const category: AdvisorCategory =
    typeof payload.category === 'string' &&
    VALID_CATEGORIES.includes(payload.category as AdvisorCategory)
      ? (payload.category as AdvisorCategory)
      : 'general';

  let suggestedActions: string[] = [];
  if (Array.isArray(payload.suggestedActions)) {
    suggestedActions = payload.suggestedActions
      .filter((a): a is string => typeof a === 'string' && a.trim().length > 0)
      .map((a) => a.trim())
      .slice(0, 5);
  }

  if (suggestedActions.length === 0) {
    suggestedActions = ['Review the current diplomatic situation'];
  }

  return { advice, category, suggestedActions };
};

const extractJson = (text: string): string => {
  return (
    text
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .match(/(\{[\s\S]*\})/)?.[1] || text.trim()
  );
};

const DIPLOMACY_OVERRIDE_KEYS = ['diplomacyInstructions'] as const;
const MAX_OVERRIDE_LENGTH = 4000;

const sanitizePromptOverrides = (raw: unknown): Record<string, string> | undefined => {
  if (!raw || typeof raw !== 'object') return undefined;
  const source = raw as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const key of DIPLOMACY_OVERRIDE_KEYS) {
    const value = source[key];
    if (typeof value === 'string' && value.length > 0 && value.length <= MAX_OVERRIDE_LENGTH) {
      out[key] = value;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
};

const AI_RESPONSE_SCHEMAS = {
  turn: {
    type: 'object',
    properties: {
      message: { type: 'string' },
      updates: { type: 'array', items: { type: 'object', additionalProperties: true } },
      storySoFar: { type: 'string' },
    },
    required: ['message', 'updates', 'storySoFar'],
  },
  chat: {
    type: 'object',
    properties: {
      message: { type: 'string' },
      tone: { type: 'string' },
      relationChange: { type: ['object', 'null'], additionalProperties: true },
    },
    required: ['message', 'tone', 'relationChange'],
  },
  advisor: {
    type: 'object',
    properties: {
      advice: { type: 'string' },
      category: { type: 'string' },
      suggestedActions: { type: 'array', items: { type: 'string' } },
    },
    required: ['advice', 'category', 'suggestedActions'],
  },
} satisfies Record<string, Parameters<typeof jsonSchema>[0]>;

async function callProvider(
  prompt: string,
  config: { provider: string; apiKey: string; model: string },
  systemPrompt: string,
  env: WorkerEnv,
  responseKind: keyof typeof AI_RESPONSE_SCHEMAS = 'turn'
): Promise<string> {
  switch (config.provider) {
    case 'local': {
      return callLocalAI({
        provider: config.model || 'claude',
        prompt,
        systemPrompt,
      });
    }
    case 'google': {
      const genAI = new GoogleGenerativeAI(config.apiKey);
      const preferredModel = normalizeGeminiModel(config.model);

      const requestGemini = async (modelName: string): Promise<string> => {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { responseMimeType: 'application/json' },
        });
        const result = await model.generateContent(prompt);
        return result.response.text();
      };

      const modelCandidates = Array.from(new Set([preferredModel, ...FALLBACK_GEMINI_MODELS]));

      let lastModelError: unknown = null;
      for (const modelName of modelCandidates) {
        try {
          return await requestGemini(modelName);
        } catch (error) {
          if (!isModelSelectionError(error)) throw error;
          lastModelError = error;
        }
      }

      if (lastModelError) throw lastModelError;
      return '{}';
    }
    case 'free-ai': {
      const gatewayModel = selectFreeAiGatewayModel(env.FREE_AI, env.NODE_ENV);
      if (gatewayModel) {
        try {
          const result = await generateText({
            model: gatewayModel,
            maxOutputTokens: 2048,
            output: Output.object({ schema: jsonSchema(AI_RESPONSE_SCHEMAS[responseKind]) }),
            system: systemPrompt,
            prompt,
            maxRetries: 0,
          });
          return result.text || '{}';
        } catch (error) {
          if (NoObjectGeneratedError.isInstance(error)) return '';
          throw error;
        }
      }
      if (env.AI) {
        const model = resolveWorkersAiModel(config.model, env.AI_MODEL);
        const budgetInput = {
          system: systemPrompt,
          prompt,
          outputSchema: AI_RESPONSE_SCHEMAS[responseKind],
          maxOutputTokens: 2048,
        };
        await reserveWorkersAiCall(env, model, budgetInput, 2048);
        const workersAi = createWorkersAI({ binding: env.AI });
        try {
          const result = await generateText({
            model: workersAi(model),
            // Turn narratives and compressed memory need more than the provider default.
            maxOutputTokens: 2048,
            output: Output.object({ schema: jsonSchema(AI_RESPONSE_SCHEMAS[responseKind]) }),
            system: systemPrompt,
            prompt,
            maxRetries: 0,
          });
          return result.text || '{}';
        } catch (error) {
          // Keep malformed output on the existing safe parse-failure path.
          // Do not log SDK errors containing the private campaign prompt/response.
          if (NoObjectGeneratedError.isInstance(error)) return '';
          throw error;
        }
      }
      const baseURL = process.env.AI_BASE_URL?.trim();
      const apiKey = config.apiKey || process.env.AI_API_KEY?.trim();
      if (!baseURL || !apiKey) {
        throw new Error('AI_BASE_URL and AI_API_KEY are required for the direct free provider');
      }
      return callOpenAICompatible({
        name: 'open-historia-direct-free',
        baseURL,
        apiKey,
        model: normalizeFreeAiModel(config.model),
        prompt,
      });
    }
    case 'deepseek': {
      return callOpenAICompatible({
        name: 'open-historia-deepseek',
        apiKey: config.apiKey,
        baseURL: 'https://api.deepseek.com',
        model: config.model,
        prompt,
      });
    }
    case 'openai': {
      return callOpenAICompatible({
        name: 'open-historia-openai',
        apiKey: config.apiKey,
        baseURL: 'https://api.openai.com/v1',
        model: config.model,
        prompt,
      });
    }
    case 'anthropic': {
      const anthropic = new Anthropic({ apiKey: config.apiKey });
      const msg = await anthropic.messages.create({
        model: config.model,
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      });
      if (msg.content[0].type === 'text') {
        return msg.content[0].text;
      }
      return '{}';
    }
    default:
      throw new Error(`Unsupported provider: ${config.provider}`);
  }
}

const llm = new Hono<{ Bindings: WorkerEnv }>();

llm.post('/turn', async (c) => {
  const ip = getClientIp(c.req.raw.headers);
  const { allowed, retryAfterMs } = rateLimit(`turn:${ip}`, {
    maxRequests: 20,
    windowMs: 60_000,
  });
  if (!allowed) {
    return c.json({ error: 'Too many requests. Please slow down.' }, 429, {
      'Retry-After': String(Math.ceil(retryAfterMs / 1000)),
    });
  }

  try {
    const {
      command,
      gameState,
      config,
      history,
      events,
      relations,
      provinceSummary,
      storySoFar,
      completedStepIds,
      promptOverrides,
    } = await c.req.json();

    if (typeof command !== 'string' || command.trim().length === 0) {
      return c.json({ error: 'Command is required' }, 400);
    }
    if (command.length > 2000) {
      return c.json({ error: 'Command is too long (max 2000 characters)' }, 400);
    }
    if (!config || typeof config.provider !== 'string') {
      return c.json({ error: 'Provider config is required' }, 400);
    }
    if (hasUnsupportedProvider(config.provider)) {
      return c.json({ error: 'Unsupported provider' }, 400);
    }

    if (config.provider !== 'local' && config.provider !== 'free-ai' && !config.apiKey) {
      return c.json({ error: 'API Key missing' }, 400);
    }

    const systemPrompt = buildGameMasterPrompt({
      command,
      gameState,
      config,
      history,
      events,
      relations,
      provinceSummary,
      storySoFar,
      completedStepIds,
      promptOverrides,
    });

    let responseText = '';

    switch (config.provider) {
      case 'local': {
        responseText = await withTimeout(
          callLocalAI({
            provider: config.model || 'claude',
            prompt: systemPrompt,
            systemPrompt:
              'You are a JSON-only response bot for a grand strategy game. Never explain your answer, only return valid JSON.',
          }),
          'local'
        );
        break;
      }
      case 'google': {
        const genAI = new GoogleGenerativeAI(config.apiKey);
        const preferredModel = normalizeGeminiModel(config.model);

        const requestGemini = async (modelName: string) => {
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: { responseMimeType: 'application/json' },
          });
          const result = await withTimeout(model.generateContent(systemPrompt), 'google');
          return result.response.text();
        };

        const modelCandidates = Array.from(new Set([preferredModel, ...FALLBACK_GEMINI_MODELS]));

        let lastModelError: unknown = null;
        for (const modelName of modelCandidates) {
          try {
            responseText = await requestGemini(modelName);
            lastModelError = null;
            break;
          } catch (error) {
            if (!isModelSelectionError(error)) throw error;
            lastModelError = error;
          }
        }

        if (!responseText && lastModelError) {
          throw lastModelError;
        }
        break;
      }
      case 'free-ai':
      case 'deepseek':
      case 'openai':
      case 'anthropic': {
        responseText = await withTimeout(
          callProvider(
            systemPrompt,
            config,
            'You are a JSON-only response bot for a grand strategy game. Never explain your answer, only return valid JSON.',
            c.env
          ),
          config.provider
        );
        break;
      }
      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }

    const fallbackYear = gameState && typeof gameState.turn === 'number' ? gameState.turn : 0;
    const parsedTurn = parseAiTurnResponse(responseText, fallbackYear);
    return c.json(
      {
        message: parsedTurn.message,
        updates: parsedTurn.updates,
        storySoFar: parsedTurn.storySoFar,
      },
      parsedTurn.parseError ? 502 : 200
    );
  } catch (error) {
    console.error(
      'AI Error:',
      error instanceof LLMTimeoutError ? 'timeout' : 'provider-or-response'
    );
    const status =
      error instanceof LLMTimeoutError ? 504 : error instanceof SharedAiBudgetError ? 503 : 500;
    return c.json(
      {
        message:
          error instanceof LLMTimeoutError
            ? 'The Game Master took too long. No changes were applied — try again.'
            : 'The Game Master is unavailable. No changes were applied — try again.',
        updates: [],
      },
      status
    );
  }
});

llm.post('/chat', async (c) => {
  const ip = getClientIp(c.req.raw.headers);
  const { allowed, retryAfterMs } = rateLimit(`chat:${ip}`, {
    maxRequests: 30,
    windowMs: 60_000,
  });
  if (!allowed) {
    return c.json({ error: 'Too many requests. Please slow down.' }, 429, {
      'Retry-After': String(Math.ceil(retryAfterMs / 1000)),
    });
  }

  try {
    const body = await c.req.json();
    const {
      message,
      playerNation,
      targetNation,
      chatHistory,
      gameContext,
      relations,
      recentEvents,
      config,
      promptOverrides: rawPromptOverrides,
    } = body;

    if (hasUnsupportedProvider(config?.provider)) {
      return c.json({ error: 'Unsupported provider' }, 400);
    }
    const promptOverrides = sanitizePromptOverrides(rawPromptOverrides);

    if (config?.provider !== 'local' && config?.provider !== 'free-ai' && !config?.apiKey) {
      return c.json({ error: 'API Key missing' }, 400);
    }
    if (!message || !playerNation || !targetNation) {
      return c.json({ error: 'Missing required fields: message, playerNation, targetNation' }, 400);
    }
    if (typeof message !== 'string' || message.length > 2000) {
      return c.json({ error: 'Message must be a string under 2000 characters' }, 400);
    }

    const prompt = buildDiplomacyPrompt({
      playerNation,
      targetNation,
      message,
      chatHistory: chatHistory || [],
      gameContext: gameContext || { year: 2026, scenario: '', difficulty: 'Realistic' },
      relations: relations || null,
      recentEvents: recentEvents || [],
      promptOverrides,
    });

    const responseText = await withTimeout(
      callProvider(
        prompt,
        config,
        "You are a JSON-only response bot for a grand strategy game's diplomacy system. Never explain your answer, only return valid JSON.",
        c.env,
        'chat'
      ),
      config.provider
    );

    const cleanJson = extractJson(responseText);
    const parsed = JSON.parse(cleanJson);
    const sanitized = sanitizeDiplomacyResponse(parsed);

    return c.json(sanitized);
  } catch (error) {
    console.error('Diplomacy Chat Error:', 'provider-or-response');
    const status =
      error instanceof LLMTimeoutError ? 504 : error instanceof SharedAiBudgetError ? 503 : 500;
    return c.json(
      {
        message:
          'The diplomatic envoy was unable to deliver the message. A courier returns with troubling news of communication failure.',
        tone: 'neutral' as DiplomacyTone,
        relationChange: null,
        error: 'The AI provider could not complete this request.',
      },
      status
    );
  }
});

llm.post('/advisor', async (c) => {
  const ip = getClientIp(c.req.raw.headers);
  const { allowed, retryAfterMs } = rateLimit(`advisor:${ip}`, {
    maxRequests: 20,
    windowMs: 60_000,
  });
  if (!allowed) {
    return c.json({ error: 'Too many requests. Please slow down.' }, 429, {
      'Retry-After': String(Math.ceil(retryAfterMs / 1000)),
    });
  }

  try {
    const body = await c.req.json();
    const {
      question,
      playerNation,
      gameContext,
      recentEvents,
      relations,
      history,
      config,
      promptOverrides,
    } = body;

    if (hasUnsupportedProvider(config?.provider)) {
      return c.json({ error: 'Unsupported provider' }, 400);
    }
    if (config?.provider !== 'local' && config?.provider !== 'free-ai' && !config?.apiKey) {
      return c.json({ error: 'API Key missing' }, 400);
    }
    if (!question || !playerNation) {
      return c.json({ error: 'Missing required fields: question, playerNation' }, 400);
    }
    if (typeof question !== 'string' || question.length > 2000) {
      return c.json({ error: 'Question must be a string under 2000 characters' }, 400);
    }

    const prompt = buildAdvisorPrompt({
      question,
      playerNation,
      gameContext: gameContext || { year: 2026, scenario: '', difficulty: 'Realistic' },
      recentEvents: recentEvents || [],
      relations: relations || [],
      history: history || [],
      promptOverrides,
    });

    const responseText = await withTimeout(
      callProvider(
        prompt,
        config,
        "You are a JSON-only response bot for a grand strategy game's advisor system. Never explain your answer, only return valid JSON.",
        c.env,
        'advisor'
      ),
      config.provider
    );

    const cleanJson = extractJson(responseText);
    const parsed = JSON.parse(cleanJson);
    const sanitized = sanitizeAdvisorResponse(parsed);

    return c.json(sanitized);
  } catch (error) {
    console.error('Advisor Error:', 'provider-or-response');
    const status =
      error instanceof LLMTimeoutError ? 504 : error instanceof SharedAiBudgetError ? 503 : 500;
    return c.json(
      {
        advice:
          'Forgive me, my liege. An unforeseen disturbance has interrupted my counsel. I shall compose my thoughts and return shortly.',
        category: 'general' as AdvisorCategory,
        suggestedActions: ['Wait and try consulting the advisor again'],
        error: 'The AI provider could not complete this request.',
      },
      status
    );
  }
});

export default llm;
