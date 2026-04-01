import type { Command, CommandContext, CommandResult } from '../types/command.js';
import { readAgentConfig, writeAgentConfig } from '../../core/config/agent-config.js';
import { providerManager } from '../../core/llm/provider-manager.js';
import ora from 'ora';
import inquirer from 'inquirer';

interface ProviderConfig {
  name: string;
  displayName: string;
  description: string;
  requiresApiKey: boolean;
  requiresBaseUrl: boolean;
  defaultModel: string;
  defaultBaseUrl?: string;
}

const PROVIDERS: ProviderConfig[] = [
  {
    name: 'ollama',
    displayName: 'Ollama (Local)',
    description: 'Run models locally on your machine',
    requiresApiKey: false,
    requiresBaseUrl: true,
    defaultModel: 'llama3.2',
    defaultBaseUrl: 'http://localhost:11434/api/generate'
  },
  {
    name: 'openai',
    displayName: 'OpenAI',
    description: 'GPT-4, GPT-3.5 and other OpenAI models',
    requiresApiKey: true,
    requiresBaseUrl: false,
    defaultModel: 'gpt-4',
    defaultBaseUrl: 'https://api.openai.com/v1'
  },
  {
    name: 'anthropic',
    displayName: 'Anthropic',
    description: 'Claude 3.5 Sonnet and other Anthropic models',
    requiresApiKey: true,
    requiresBaseUrl: false,
    defaultModel: 'claude-3-5-sonnet-20241022',
    defaultBaseUrl: 'https://api.anthropic.com/v1'
  },
  {
    name: 'google',
    displayName: 'Google AI',
    description: 'Gemini Pro and other Google models',
    requiresApiKey: true,
    requiresBaseUrl: false,
    defaultModel: 'gemini-pro'
  },
  {
    name: 'openrouter',
    displayName: 'OpenRouter',
    description: 'Access to multiple models with intelligent routing',
    requiresApiKey: true,
    requiresBaseUrl: false,
    defaultModel: 'anthropic/claude-3.5-sonnet',
    defaultBaseUrl: 'https://openrouter.ai/api/v1'
  },
  {
    name: 'groq',
    displayName: 'Groq',
    description: 'Ultra-fast models from Groq',
    requiresApiKey: true,
    requiresBaseUrl: false,
    defaultModel: 'llama-3.1-70b-versatile',
    defaultBaseUrl: 'https://api.groq.com/openai/v1'
  },
  {
    name: 'cohere',
    displayName: 'Cohere',
    description: 'Command R+ and other Cohere models',
    requiresApiKey: true,
    requiresBaseUrl: false,
    defaultModel: 'command-r-plus',
    defaultBaseUrl: 'https://api.cohere.ai/v1'
  },
  {
    name: 'mistral',
    displayName: 'Mistral AI',
    description: 'Mistral Large and other Mistral models',
    requiresApiKey: true,
    requiresBaseUrl: false,
    defaultModel: 'mistral-large-latest',
    defaultBaseUrl: 'https://api.mistral.ai/v1'
  },
  {
    name: 'together',
    displayName: 'Together AI',
    description: 'Wide selection of open source models',
    requiresApiKey: true,
    requiresBaseUrl: false,
    defaultModel: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
    defaultBaseUrl: 'https://api.together.xyz/v1'
  },
  {
    name: 'custom',
    displayName: 'Custom',
    description: 'Configure your own API provider',
    requiresApiKey: false,
    requiresBaseUrl: true,
    defaultModel: ''
  }
];

const handleProviderSetup = async (): Promise<CommandResult> => {
  console.clear();
  console.log('🔧 AI Provider Configuration\n');

  try {
    const answers = await inquirer.prompt([
      {
        type: 'select',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: '📋 View all providers', value: 'list' },
          { name: '⚙️ Configure a provider', value: 'configure' },
          { name: '🔄 Switch active provider', value: 'switch' },
          { name: '➕ Create custom provider', value: 'custom' },
          { name: '❌ Exit', value: 'exit' }
        ]
      }
    ]);

    const action = answers.action;
    console.log('Selected action:', action);

    switch (action) {
      case 'list':
        return await showProvidersList();
      case 'configure':
        return await configureProvider();
      case 'switch':
        return await switchProvider();
      case 'custom':
        return await configureCustomProvider();
      case 'exit':
        return { success: true, message: 'Configuration cancelled' };
      default:
        console.log('Unknown action:', action);
        return { success: false, message: 'Invalid action' };
    }
  } catch (error) {
    console.error('Error in setup:', error);
    return { success: false, message: 'Setup failed' };
  }
};

const showProvidersList = async (): Promise<CommandResult> => {
  const config = readAgentConfig();
  const validatedProviders = providerManager.getValidatedProviders();

  console.log('\n📋 Provider Status:\n');

  const tableData = validatedProviders.map(({ name, valid }) => {
    const providerInfo = PROVIDERS.find(p => p.name === name);
    const isCurrent = name === config.provider;
    const status = valid ? '✅ Configured' : '❌ Not configured';
    const current = isCurrent ? ' (ACTIVE)' : '';

    return {
      name: `${providerInfo?.displayName || name}${current}`,
      status,
      description: providerInfo?.description || 'Custom provider'
    };
  });

  console.table(tableData);

  const { shouldContinue } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'shouldContinue',
      message: 'Would you like to configure any provider?',
      default: false
    }
  ]);

  if (shouldContinue) {
    return await configureProvider();
  }

  return { success: true };
};

const configureProvider = async (): Promise<CommandResult> => {
  const validatedProviders = providerManager.getValidatedProviders();

  const choices = PROVIDERS.map(provider => {
    const validation = validatedProviders.find(vp => vp.name === provider.name);
    const status = validation?.valid ? '✅' : '❌';
    return {
      name: `${status} ${provider.displayName} - ${provider.description}`,
      value: provider.name
    };
  });

  const { selectedProvider } = await inquirer.prompt([
    {
      type: 'select',
      name: 'selectedProvider',
      message: 'Select a provider to configure:',
      choices
    }
  ]);

  const providerInfo = PROVIDERS.find(p => p.name === selectedProvider);
  if (!providerInfo) {
    return { success: false, message: 'Provider not found' };
  }

  console.log(`\n⚙️  Configuring ${providerInfo.displayName}...\n`);

  switch (selectedProvider) {
    case 'ollama':
      return await configureOllama();
    case 'openai':
      return await configureOpenAI();
    case 'anthropic':
      return await configureAnthropic();
    case 'google':
      return await configureGoogle();
    case 'openrouter':
      return await configureOpenRouter();
    case 'groq':
      return await configureGroq();
    case 'cohere':
      return await configureCohere();
    case 'mistral':
      return await configureMistral();
    case 'together':
      return await configureTogether();
    case 'custom':
      return await configureCustomProvider();
    default:
      return { success: false, message: 'Provider not supported' };
  }
};

const configureOllama = async (): Promise<CommandResult> => {
  const currentConfig = readAgentConfig();
  const currentOllama = currentConfig.providers.ollama;

  const { url, model, testConnection } = await inquirer.prompt([
    {
      type: 'input',
      name: 'url',
      message: 'Ollama URL:',
      default: currentOllama.url,
      validate: (input) => input.trim() !== '' || 'URL is required'
    },
    {
      type: 'input',
      name: 'model',
      message: 'Model (e.g., llama3.2, qwen2.5-coder):',
      default: currentOllama.model,
      validate: (input) => input.trim() !== '' || 'Model is required'
    },
    {
      type: 'confirm',
      name: 'testConnection',
      message: 'Test connection?',
      default: true
    }
  ]);

  if (testConnection) {
    const spinner = ora('Testing connection with Ollama...').start();

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt: 'test',
          stream: false,
          options: { temperature: 0 },
        }),
      });

      if (response.ok) {
        spinner.succeed('Connection successful with Ollama');
      } else {
        spinner.fail('Connection failed');
        return { success: false, message: `Error: ${response.status}` };
      }
    } catch (error) {
      spinner.fail('Connection failed');
      return { success: false, message: `Error: ${error}` };
    }
  }

  writeAgentConfig({
    provider: 'ollama',
    providers: {
      ...currentConfig.providers,
      ollama: { url, model }
    }
  });

  console.log('\n✅ Ollama configured successfully!');
  return { success: true };
};

const configureOpenAI = async (): Promise<CommandResult> => {
  const currentConfig = readAgentConfig();
  const currentOpenAI = currentConfig.providers.openai;

  const { apiKey, model, baseUrl, testConnection } = await inquirer.prompt([
    {
      type: 'password',
      name: 'apiKey',
      message: 'OpenAI API Key:',
      validate: (input) => input.trim() !== '' || 'API Key is required'
    },
    {
      type: 'input',
      name: 'model',
      message: 'Model:',
      default: currentOpenAI.model || 'gpt-4',
      validate: (input) => input.trim() !== '' || 'Model is required'
    },
    {
      type: 'input',
      name: 'baseUrl',
      message: 'Base URL (optional):',
      default: currentOpenAI.base_url
    },
    {
      type: 'confirm',
      name: 'testConnection',
      message: 'Test connection?',
      default: true
    }
  ]);

  if (testConnection) {
    const spinner = ora('Testing connection with OpenAI...').start();

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'test' }],
          temperature: 0,
        }),
      });

      if (response.ok) {
        spinner.succeed('Connection successful with OpenAI');
      } else {
        spinner.fail('Connection failed');
        return { success: false, message: `Error: ${response.status}` };
      }
    } catch (error) {
      spinner.fail('Connection failed');
      return { success: false, message: `Error: ${error}` };
    }
  }

  writeAgentConfig({
    provider: 'openai',
    providers: {
      ...currentConfig.providers,
      openai: { api_key: apiKey, model, base_url: baseUrl }
    }
  });

  console.log('\n✅ OpenAI configured successfully!');
  return { success: true };
};

const configureAnthropic = async (): Promise<CommandResult> => {
  const currentConfig = readAgentConfig();
  const currentAnthropic = currentConfig.providers.anthropic;

  const { apiKey, model, baseUrl, testConnection } = await inquirer.prompt([
    {
      type: 'password',
      name: 'apiKey',
      message: 'Anthropic API Key:',
      validate: (input) => input.trim() !== '' || 'API Key is required'
    },
    {
      type: 'input',
      name: 'model',
      message: 'Model:',
      default: currentAnthropic.model || 'claude-3-5-sonnet-20241022',
      validate: (input) => input.trim() !== '' || 'Model is required'
    },
    {
      type: 'input',
      name: 'baseUrl',
      message: 'Base URL (optional):',
      default: currentAnthropic.base_url
    },
    {
      type: 'confirm',
      name: 'testConnection',
      message: 'Test connection?',
      default: true
    }
  ]);

  if (testConnection) {
    const spinner = ora('Testing connection with Anthropic...').start();

    try {
      const response = await fetch(`${baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 100,
          messages: [{ role: 'user', content: 'test' }],
          temperature: 0,
        }),
      });

      if (response.ok) {
        spinner.succeed('Connection successful with Anthropic');
      } else {
        spinner.fail('Connection failed');
        return { success: false, message: `Error: ${response.status}` };
      }
    } catch (error) {
      spinner.fail('Connection failed');
      return { success: false, message: `Error: ${error}` };
    }
  }

  writeAgentConfig({
    provider: 'anthropic',
    providers: {
      ...currentConfig.providers,
      anthropic: { api_key: apiKey, model, base_url: baseUrl }
    }
  });

  console.log('\n✅ Anthropic configured successfully!');
  return { success: true };
};

const configureGoogle = async (): Promise<CommandResult> => {
  const currentConfig = readAgentConfig();
  const currentGoogle = currentConfig.providers.google;

  const { apiKey, model, testConnection } = await inquirer.prompt([
    {
      type: 'password',
      name: 'apiKey',
      message: 'Google AI API Key:',
      validate: (input) => input.trim() !== '' || 'API Key is required'
    },
    {
      type: 'input',
      name: 'model',
      message: 'Model:',
      default: currentGoogle.model || 'gemini-pro',
      validate: (input) => input.trim() !== '' || 'Model is required'
    },
    {
      type: 'confirm',
      name: 'testConnection',
      message: 'Test connection?',
      default: true
    }
  ]);

  if (testConnection) {
    const spinner = ora('Testing connection with Google AI...').start();

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'test' }] }],
          generationConfig: { temperature: 0 },
        }),
      });

      if (response.ok) {
        spinner.succeed('Connection successful with Google AI');
      } else {
        spinner.fail('Connection failed');
        return { success: false, message: `Error: ${response.status}` };
      }
    } catch (error) {
      spinner.fail('Connection failed');
      return { success: false, message: `Error: ${error}` };
    }
  }

  writeAgentConfig({
    provider: 'google',
    providers: {
      ...currentConfig.providers,
      google: { api_key: apiKey, model }
    }
  });

  console.log('\n✅ Google AI configured successfully!');
  return { success: true };
};

const configureOpenRouter = async (): Promise<CommandResult> => {
  const currentConfig = readAgentConfig();
  const currentOpenRouter = currentConfig.providers.openrouter;

  const { apiKey, model, baseUrl, testConnection } = await inquirer.prompt([
    {
      type: 'password',
      name: 'apiKey',
      message: 'OpenRouter API Key:',
      validate: (input) => input.trim() !== '' || 'API Key is required'
    },
    {
      type: 'input',
      name: 'model',
      message: 'Model:',
      default: currentOpenRouter.model || 'anthropic/claude-3.5-sonnet',
      validate: (input) => input.trim() !== '' || 'Model is required'
    },
    {
      type: 'input',
      name: 'baseUrl',
      message: 'Base URL (optional):',
      default: currentOpenRouter.base_url
    },
    {
      type: 'confirm',
      name: 'testConnection',
      message: 'Test connection?',
      default: true
    }
  ]);

  if (testConnection) {
    const spinner = ora('Testing connection with OpenRouter...').start();

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://adelie.ai',
          'X-Title': 'Adelie AI Assistant',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'test' }],
          temperature: 0,
        }),
      });

      if (response.ok) {
        spinner.succeed('Connection successful with OpenRouter');
      } else {
        spinner.fail('Connection failed');
        return { success: false, message: `Error: ${response.status}` };
      }
    } catch (error) {
      spinner.fail('Connection failed');
      return { success: false, message: `Error: ${error}` };
    }
  }

  writeAgentConfig({
    provider: 'openrouter',
    providers: {
      ...currentConfig.providers,
      openrouter: { api_key: apiKey, model, base_url: baseUrl }
    }
  });

  console.log('\n✅ OpenRouter configured successfully!');
  return { success: true };
};

const configureGroq = async (): Promise<CommandResult> => {
  const currentConfig = readAgentConfig();
  const currentGroq = currentConfig.providers.groq;

  const { apiKey, model, baseUrl, testConnection } = await inquirer.prompt([
    {
      type: 'password',
      name: 'apiKey',
      message: 'Groq API Key:',
      validate: (input) => input.trim() !== '' || 'API Key is required'
    },
    {
      type: 'input',
      name: 'model',
      message: 'Model:',
      default: currentGroq.model || 'llama-3.1-70b-versatile',
      validate: (input) => input.trim() !== '' || 'Model is required'
    },
    {
      type: 'input',
      name: 'baseUrl',
      message: 'Base URL (optional):',
      default: currentGroq.base_url
    },
    {
      type: 'confirm',
      name: 'testConnection',
      message: 'Test connection?',
      default: true
    }
  ]);

  if (testConnection) {
    const spinner = ora('Testing connection with Groq...').start();

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'test' }],
          temperature: 0,
        }),
      });

      if (response.ok) {
        spinner.succeed('Connection successful with Groq');
      } else {
        spinner.fail('Connection failed');
        return { success: false, message: `Error: ${response.status}` };
      }
    } catch (error) {
      spinner.fail('Connection failed');
      return { success: false, message: `Error: ${error}` };
    }
  }

  writeAgentConfig({
    provider: 'groq',
    providers: {
      ...currentConfig.providers,
      groq: { api_key: apiKey, model, base_url: baseUrl }
    }
  });

  console.log('\n✅ Groq configured successfully!');
  return { success: true };
};

const configureCohere = async (): Promise<CommandResult> => {
  const currentConfig = readAgentConfig();
  const currentCohere = currentConfig.providers.cohere;

  const { apiKey, model, baseUrl, testConnection } = await inquirer.prompt([
    {
      type: 'password',
      name: 'apiKey',
      message: 'Cohere API Key:',
      validate: (input) => input.trim() !== '' || 'API Key is required'
    },
    {
      type: 'input',
      name: 'model',
      message: 'Model:',
      default: currentCohere.model || 'command-r-plus',
      validate: (input) => input.trim() !== '' || 'Model is required'
    },
    {
      type: 'input',
      name: 'baseUrl',
      message: 'Base URL (optional):',
      default: currentCohere.base_url
    },
    {
      type: 'confirm',
      name: 'testConnection',
      message: 'Test connection?',
      default: true
    }
  ]);

  if (testConnection) {
    const spinner = ora('Testing connection with Cohere...').start();

    try {
      const response = await fetch(`${baseUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          message: 'test',
          temperature: 0,
        }),
      });

      if (response.ok) {
        spinner.succeed('Connection successful with Cohere');
      } else {
        spinner.fail('Connection failed');
        return { success: false, message: `Error: ${response.status}` };
      }
    } catch (error) {
      spinner.fail('Connection failed');
      return { success: false, message: `Error: ${error}` };
    }
  }

  writeAgentConfig({
    provider: 'cohere',
    providers: {
      ...currentConfig.providers,
      cohere: { api_key: apiKey, model, base_url: baseUrl }
    }
  });

  console.log('\n✅ Cohere configured successfully!');
  return { success: true };
};

const configureMistral = async (): Promise<CommandResult> => {
  const currentConfig = readAgentConfig();
  const currentMistral = currentConfig.providers.mistral;

  const { apiKey, model, baseUrl, testConnection } = await inquirer.prompt([
    {
      type: 'password',
      name: 'apiKey',
      message: 'Mistral API Key:',
      validate: (input) => input.trim() !== '' || 'API Key is required'
    },
    {
      type: 'input',
      name: 'model',
      message: 'Model:',
      default: currentMistral.model || 'mistral-large-latest',
      validate: (input) => input.trim() !== '' || 'Model is required'
    },
    {
      type: 'input',
      name: 'baseUrl',
      message: 'Base URL (optional):',
      default: currentMistral.base_url
    },
    {
      type: 'confirm',
      name: 'testConnection',
      message: 'Test connection?',
      default: true
    }
  ]);

  if (testConnection) {
    const spinner = ora('Testing connection with Mistral...').start();

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'test' }],
          temperature: 0,
        }),
      });

      if (response.ok) {
        spinner.succeed('Connection successful with Mistral');
      } else {
        spinner.fail('Connection failed');
        return { success: false, message: `Error: ${response.status}` };
      }
    } catch (error) {
      spinner.fail('Connection failed');
      return { success: false, message: `Error: ${error}` };
    }
  }

  writeAgentConfig({
    provider: 'mistral',
    providers: {
      ...currentConfig.providers,
      mistral: { api_key: apiKey, model, base_url: baseUrl }
    }
  });

  console.log('\n✅ Mistral configured successfully!');
  return { success: true };
};

const configureTogether = async (): Promise<CommandResult> => {
  const currentConfig = readAgentConfig();
  const currentTogether = currentConfig.providers.together;

  const { apiKey, model, baseUrl, testConnection } = await inquirer.prompt([
    {
      type: 'password',
      name: 'apiKey',
      message: 'Together AI API Key:',
      validate: (input) => input.trim() !== '' || 'API Key is required'
    },
    {
      type: 'input',
      name: 'model',
      message: 'Model:',
      default: currentTogether.model || 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
      validate: (input) => input.trim() !== '' || 'Model is required'
    },
    {
      type: 'input',
      name: 'baseUrl',
      message: 'Base URL (optional):',
      default: currentTogether.base_url
    },
    {
      type: 'confirm',
      name: 'testConnection',
      message: 'Test connection?',
      default: true
    }
  ]);

  if (testConnection) {
    const spinner = ora('Testing connection with Together AI...').start();

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'test' }],
          temperature: 0,
        }),
      });

      if (response.ok) {
        spinner.succeed('Connection successful with Together AI');
      } else {
        spinner.fail('Connection failed');
        return { success: false, message: `Error: ${response.status}` };
      }
    } catch (error) {
      spinner.fail('Connection failed');
      return { success: false, message: `Error: ${error}` };
    }
  }

  writeAgentConfig({
    provider: 'together',
    providers: {
      ...currentConfig.providers,
      together: { api_key: apiKey, model, base_url: baseUrl }
    }
  });

  console.log('\n✅ Together AI configured successfully!');
  return { success: true };
};

const configureCustomProvider = async (): Promise<CommandResult> => {
  const currentConfig = readAgentConfig();
  const currentCustom = currentConfig.providers.custom;

  console.log('🔧 Configuring Custom Provider\n');

  const { name, baseUrl, model, authType, apiKey, customAuth, testConnection } = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Provider name:',
      validate: (input) => input.trim() !== '' || 'Name is required'
    },
    {
      type: 'input',
      name: 'baseUrl',
      message: 'Base URL:',
      default: currentCustom.base_url,
      validate: (input) => input.trim() !== '' || 'Base URL is required'
    },
    {
      type: 'input',
      name: 'model',
      message: 'Model:',
      default: currentCustom.model,
      validate: (input) => input.trim() !== '' || 'Model is required'
    },
    {
      type: 'list',
      name: 'authType',
      message: 'Authentication type:',
      choices: [
        { name: 'Bearer Token', value: 'bearer' },
        { name: 'API Key Header', value: 'api-key' },
        { name: 'Custom', value: 'custom' },
        { name: 'No authentication', value: 'none' }
      ],
      default: currentCustom.auth_type || 'bearer'
    },
    {
      type: 'password',
      name: 'apiKey',
      message: 'API Key (if applicable):',
      when: (answers) => answers.authType !== 'none'
    },
    {
      type: 'input',
      name: 'customAuth',
      message: 'Custom header (format: "Header-Name: value"):',
      when: (answers) => answers.authType === 'custom',
      validate: (input, answers) => {
        if (answers?.authType === 'custom') {
          return input.includes(':') || 'Incorrect format. Use: "Header-Name: value"';
        }
        return true;
      }
    },
    {
      type: 'confirm',
      name: 'testConnection',
      message: 'Test connection?',
      default: true
    }
  ]);

  if (testConnection) {
    const spinner = ora('Testing connection with custom provider...').start();

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      // Add authentication
      if (authType !== 'none' && apiKey) {
        switch (authType) {
          case 'bearer':
            headers['Authorization'] = `Bearer ${apiKey}`;
            break;
          case 'api-key':
            headers['X-API-Key'] = apiKey;
            break;
          case 'custom':
            if (customAuth) {
              const [key, value] = customAuth.split(':');
              headers[key.trim()] = value.trim();
            }
            break;
        }
      }

      const response = await fetch(baseUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'test' }],
          temperature: 0,
        }),
      });

      if (response.ok) {
        spinner.succeed('Connection successful with custom provider');
      } else {
        spinner.fail('Connection failed');
        return { success: false, message: `Error: ${response.status}` };
      }
    } catch (error) {
      spinner.fail('Connection failed');
      return { success: false, message: `Error: ${error}` };
    }
  }

  const customConfig = {
    model,
    base_url: baseUrl,
    headers: {},
    auth_type: authType as 'bearer' | 'api-key' | 'custom',
    api_key: apiKey || undefined,
    custom_auth: customAuth || undefined
  };

  writeAgentConfig({
    provider: 'custom',
    providers: {
      ...currentConfig.providers,
      custom: customConfig
    }
  });

  console.log(`\n✅ Custom provider "${name}" configured successfully!`);
  return { success: true };
};

const switchProvider = async (): Promise<CommandResult> => {
  const config = readAgentConfig();
  const validatedProviders = providerManager.getValidatedProviders();

  const configuredProviders = validatedProviders.filter(vp => vp.valid);

  if (configuredProviders.length === 0) {
    return { success: false, message: 'No providers configured. Please configure one first.' };
  }

  const choices = configuredProviders.map(({ name }) => {
    const providerInfo = PROVIDERS.find(p => p.name === name);
    const isCurrent = name === config.provider;
    const current = isCurrent ? ' (CURRENT)' : '';
    return {
      name: `${providerInfo?.displayName || name}${current}`,
      value: name
    };
  });

  const { selectedProvider } = await inquirer.prompt([
    {
      type: 'select',
      name: 'selectedProvider',
      message: 'Select the active provider:',
      choices
    }
  ]);

  writeAgentConfig({ provider: selectedProvider as any });

  const providerInfo = PROVIDERS.find(p => p.name === selectedProvider);
  console.log(`\n✅ Switched to ${providerInfo?.displayName || selectedProvider} as active provider`);

  return { success: true };
};

const handleProviderSwitch = async (providerName: string): Promise<CommandResult> => {
  const availableProviders = providerManager.getAvailableProviders();

  if (!availableProviders.includes(providerName)) {
    return { success: false, message: `Unknown provider: ${providerName}` };
  }

  const provider = providerManager.getProvider(providerName);
  if (!provider?.validateConfig()) {
    return { success: false, message: `Provider ${providerName} is not properly configured` };
  }

  const config = readAgentConfig();
  writeAgentConfig({ provider: providerName as any });

  console.log(`✅ Switched to ${providerName} provider`);
  return { success: true };
};

const handleProviderList = (): CommandResult => {
  const config = readAgentConfig();
  const currentProvider = config.provider;
  const validatedProviders = providerManager.getValidatedProviders();

  console.log('\n📋 Provider Status:\n');
  console.log(`Current provider: ${currentProvider}`);
  console.log('\nAll providers:');

  validatedProviders.forEach(({ name, valid }) => {
    const status = valid ? '✅' : '❌';
    const current = name === currentProvider ? ' (current)' : '';
    console.log(`  ${status} ${name}${current}`);
  });

  return { success: true };
};

export const providerCommand: Command = {
  name: 'provider',
  description: 'Manage AI providers with interactive TUI',
  usage: 'adelie provider [subcommand] [options]',
  examples: [
    'adelie provider setup',
    'adelie provider list',
    'adelie provider switch openai',
    'adelie provider switch google'
  ],
  subcommands: {
    setup: {
      name: 'setup',
      description: 'Interactive TUI setup for AI providers',
      usage: 'adelie provider setup',
      examples: ['adelie provider setup'],
      handler: async () => await handleProviderSetup()
    },
    list: {
      name: 'list',
      description: 'List all providers and their status',
      usage: 'adelie provider list',
      examples: ['adelie provider list'],
      handler: () => handleProviderList()
    },
    switch: {
      name: 'switch',
      description: 'Switch to a different provider',
      usage: 'adelie provider switch <provider>',
      examples: [
        'adelie provider switch openai',
        'adelie provider switch google',
        'adelie provider switch openrouter',
        'adelie provider switch ollama'
      ],
      handler: async (context: CommandContext) => await handleProviderSwitch(context.args[0])
    }
  },
  handler: async (context: CommandContext): Promise<CommandResult> => {
    const [subcommand, ...rest] = context.args;

    if (!subcommand || subcommand === "list") {
      return handleProviderList();
    }

    if (subcommand === "setup") {
      return await handleProviderSetup();
    }

    if (subcommand === "switch") {
      return await handleProviderSwitch(rest[0]);
    }

    return {
      success: false,
      message: "Unknown provider command. Use 'adelie provider --help' for available commands."
    };
  }
};
