import { AiProvider } from './types';
import { AiSettings } from '../../types';
import { GeminiProvider } from './geminiProvider';
import { OpenAiProvider } from './openAiProvider';
import { LocalLlmProvider } from './localLlmProvider';

export class AiFactory {
  static createProvider(settings: AiSettings): AiProvider {
    switch (settings.activeProvider) {
      case 'gemini':
        return new GeminiProvider(settings);

      case 'openai':
        return new OpenAiProvider(settings);

      case 'ollama':
        return new LocalLlmProvider('ollama', settings);

      case 'lmstudio':
        return new LocalLlmProvider('lmstudio', settings);

      case 'llamacpp':
        return new LocalLlmProvider('llamacpp', settings);

      default:
        throw new Error(`Unsupported AI Provider: ${settings.activeProvider}`);
    }
  }
}
