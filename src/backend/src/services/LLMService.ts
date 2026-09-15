import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  text: string;
  model: string;
  provider: string;
}

/**
 * LLM abstraction layer.
 * Supports: watsonx.ai, OpenAI, none (stub).
 * Used ONLY for natural-language generation (CAPA narrative).
 * Never used for deterministic calculations or risk scoring.
 */
export class LLMService {
  async generate(messages: LLMMessage[], maxTokens = 1024): Promise<LLMResponse> {
    const provider = env.LLM_PROVIDER;
    logger.info({ provider }, 'LLMService: generate called');

    switch (provider) {
      case 'watsonx':
        return this._callWatsonx(messages, maxTokens);
      case 'openai':
        return this._callOpenAI(messages, maxTokens);
      default:
        return this._stub(messages);
    }
  }

  private async _callWatsonx(messages: LLMMessage[], maxTokens: number): Promise<LLMResponse> {
    const apiKey = env.WATSONX_API_KEY;
    const projectId = env.WATSONX_PROJECT_ID;
    const baseUrl = env.WATSONX_URL ?? 'https://us-south.ml.cloud.ibm.com';
    const modelId = env.WATSONX_MODEL_ID;

    if (!apiKey || !projectId) {
      logger.warn('watsonx credentials missing — falling back to stub');
      return this._stub(messages);
    }

    // Get IAM token
    const tokenRes = await fetch('https://iam.cloud.ibm.com/identity/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=${apiKey}`,
    });
    if (!tokenRes.ok) throw new Error('Failed to obtain IBM IAM token');
    const tokenData = await tokenRes.json() as { access_token: string };

    // Build prompt from messages
    const prompt = messages.map((m) => {
      if (m.role === 'system') return `[INST] <<SYS>>\n${m.content}\n<</SYS>>\n`;
      if (m.role === 'user') return `${m.content} [/INST]`;
      return m.content;
    }).join('\n');

    const inferRes = await fetch(
      `${baseUrl}/ml/v1/text/generation?version=2023-05-29`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenData.access_token}`,
        },
        body: JSON.stringify({
          model_id: modelId,
          input: prompt,
          parameters: { max_new_tokens: maxTokens, temperature: 0.3 },
          project_id: projectId,
        }),
      },
    );

    if (!inferRes.ok) {
      const body = await inferRes.text();
      throw new Error(`watsonx inference failed: ${inferRes.status} ${body}`);
    }

    const result = await inferRes.json() as { results: Array<{ generated_text: string }> };
    return {
      text: result.results?.[0]?.generated_text ?? '',
      model: modelId,
      provider: 'watsonx',
    };
  }

  private async _callOpenAI(messages: LLMMessage[], maxTokens: number): Promise<LLMResponse> {
    const apiKey = env.OPENAI_API_KEY;
    if (!apiKey) {
      logger.warn('OpenAI API key missing — falling back to stub');
      return this._stub(messages);
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: maxTokens,
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`OpenAI request failed: ${res.status} ${body}`);
    }

    const data = await res.json() as { choices: Array<{ message: { content: string } }>; model: string };
    return {
      text: data.choices?.[0]?.message?.content ?? '',
      model: data.model,
      provider: 'openai',
    };
  }

  private _stub(messages: LLMMessage[]): LLMResponse {
    const lastUser = [...messages].reverse().find((m: LLMMessage) => m.role === 'user')?.content ?? '';
    return {
      text: `[LLM_PROVIDER=none] CAPA narrative generation is not available without a configured LLM provider. The following verified deviations were provided: ${lastUser.slice(0, 300)}...`,
      model: 'none',
      provider: 'none',
    };
  }
}

export const llmService = new LLMService();
