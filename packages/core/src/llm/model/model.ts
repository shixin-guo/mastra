import { generateText, generateObject, jsonSchema, streamText, streamObject, Output } from 'ai';
import type { LanguageModel, Schema, CoreMessage } from 'ai';
import type { JSONSchema7 } from 'json-schema';
import { z } from 'zod';
import type { ZodSchema } from 'zod';

import type {
  GenerateReturn,
  LLMTextOptions,
  LLMInnerStreamOptions,
  LLMStreamObjectOptions,
  LLMStreamOptions,
  LLMTextObjectOptions,
  StreamReturn,
} from '../';
import type { MastraPrimitives } from '../../action';
import type { ToolsInput } from '../../agent/types';
import type { CoreTool } from '../../tools';
import { delay } from '../../utils';

import { MastraLLMBase } from './base';

export class MastraLLM extends MastraLLMBase {
  #model: LanguageModel;
  #mastra?: MastraPrimitives;

  constructor({ model, mastra }: { model: LanguageModel; mastra?: MastraPrimitives }) {
    super({ name: 'aisdk', model });

    this.#model = model;

    if (mastra) {
      this.#mastra = mastra;
      if (mastra.logger) {
        this.__setLogger(mastra.logger);
      }
    }
  }

  __registerPrimitives(p: MastraPrimitives) {
    if (p.telemetry) {
      this.__setTelemetry(p.telemetry);
    }

    if (p.logger) {
      this.__setLogger(p.logger);
    }

    this.#mastra = p;
  }

  getProvider() {
    return this.#model.provider;
  }

  getModelId() {
    return this.#model.modelId;
  }

  getModel() {
    return this.#model;
  }

  convertTools({ tools, runId }: { tools?: ToolsInput; runId?: string } = {}): Record<string, CoreTool> {
    this.logger.debug('Starting tool conversion for LLM');
    const converted = Object.entries(tools || {}).reduce(
      (memo, value) => {
        const k = value[0] as string;
        const tool = value[1];

        if (tool) {
          memo[k] = {
            description: tool.description!,
            parameters: tool.inputSchema,
            execute: async (props: any) => {
              try {
                this.logger.debug('Executing tool', {
                  tool: k,
                  props,
                });
                return (
                  tool?.execute?.({
                    context: props,
                    mastra: this.#mastra,
                    runId,
                  }) ?? undefined
                );
              } catch (error) {
                this.logger.error('Error executing tool', {
                  tool: k,
                  props,
                  error,
                });
                throw error;
              }
            },
          };
        }

        return memo;
      },
      {} as Record<string, CoreTool>,
    );

    this.logger.debug(`Converted tools for LLM`);

    return converted;
  }

  async __text<Z extends ZodSchema | JSONSchema7 | undefined>({
    runId,
    messages,
    maxSteps,
    tools,
    convertedTools,
    temperature,
    toolChoice = 'auto',
    onStepFinish,
    experimental_output,
  }: LLMTextOptions<Z>) {
    const model = this.#model;

    this.logger.debug(`[LLM] - Generating text`, {
      runId,
      messages,
      maxSteps,
      tools: Object.keys(tools || convertedTools || {}),
    });

    const finalTools = convertedTools || this.convertTools({ tools, runId });

    const argsForExecute = {
      model,
      temperature,
      tools: {
        ...finalTools,
      },
      toolChoice,
      maxSteps,
      onStepFinish: async (props: any) => {
        onStepFinish?.(JSON.stringify(props, null, 2));

        this.logger.debug('[LLM] - Step Change:', {
          text: props?.text,
          toolCalls: props?.toolCalls,
          toolResults: props?.toolResults,
          finishReason: props?.finishReason,
          usage: props?.usage,
          runId,
        });

        if (
          props?.response?.headers?.['x-ratelimit-remaining-tokens'] &&
          parseInt(props?.response?.headers?.['x-ratelimit-remaining-tokens'], 10) < 2000
        ) {
          this.logger.warn('Rate limit approaching, waiting 10 seconds', { runId });
          await delay(10 * 1000);
        }
      },
    };

    let schema: z.ZodType<Z> | Schema<Z> | undefined;

    if (experimental_output) {
      this.logger.debug('[LLM] - Using experimental output', {
        runId,
      });
      if (typeof (experimental_output as any).parse === 'function') {
        schema = experimental_output as z.ZodType<Z>;
        if (schema instanceof z.ZodArray) {
          schema = schema._def.type as z.ZodType<Z>;
        }
      } else {
        schema = jsonSchema(experimental_output as JSONSchema7) as Schema<Z>;
      }
    }

    return await generateText({
      messages,
      ...argsForExecute,
      experimental_telemetry: this.experimental_telemetry,
      experimental_output: schema
        ? Output.object({
            schema,
          })
        : undefined,
    });
  }

  async __textObject<T>({
    messages,
    onStepFinish,
    maxSteps = 5,
    tools,
    convertedTools,
    structuredOutput,
    runId,
    temperature,
    toolChoice = 'auto',
  }: LLMTextObjectOptions<T>) {
    const model = this.#model;

    this.logger.debug(`[LLM] - Generating a text object`, { runId });

    const finalTools = convertedTools || this.convertTools({ tools, runId });

    const argsForExecute = {
      model,
      temperature,
      tools: {
        ...finalTools,
      },
      maxSteps,
      toolChoice,
      onStepFinish: async (props: any) => {
        onStepFinish?.(JSON.stringify(props, null, 2));

        this.logger.debug('[LLM] - Step Change:', {
          text: props?.text,
          toolCalls: props?.toolCalls,
          toolResults: props?.toolResults,
          finishReason: props?.finishReason,
          usage: props?.usage,
          runId,
        });

        if (
          props?.response?.headers?.['x-ratelimit-remaining-tokens'] &&
          parseInt(props?.response?.headers?.['x-ratelimit-remaining-tokens'], 10) < 2000
        ) {
          this.logger.warn('Rate limit approaching, waiting 10 seconds', { runId });
          await delay(10 * 1000);
        }
      },
    };

    let schema: z.ZodType<T> | Schema<T>;
    let output = 'object';

    if (typeof (structuredOutput as any).parse === 'function') {
      schema = structuredOutput as z.ZodType<T>;
      if (schema instanceof z.ZodArray) {
        output = 'array';
        schema = schema._def.type as z.ZodType<T>;
      }
    } else {
      schema = jsonSchema(structuredOutput as JSONSchema7) as Schema<T>;
    }

    return await generateObject({
      messages,
      ...argsForExecute,
      output: output as any,
      schema,
      experimental_telemetry: this.experimental_telemetry,
    });
  }

  async __stream<Z extends ZodSchema | JSONSchema7 | undefined = undefined>({
    messages,
    onStepFinish,
    onFinish,
    maxSteps = 5,
    tools,
    convertedTools,
    runId,
    temperature,
    toolChoice = 'auto',
    experimental_output,
  }: LLMInnerStreamOptions<Z>) {
    const model = this.#model;
    this.logger.debug(`[LLM] - Streaming text`, {
      runId,
      messages,
      maxSteps,
      tools: Object.keys(tools || convertedTools || {}),
    });

    const finalTools = convertedTools || this.convertTools({ tools, runId });

    const argsForExecute = {
      model,
      temperature,
      tools: {
        ...finalTools,
      },
      maxSteps,
      toolChoice,
      onStepFinish: async (props: any) => {
        onStepFinish?.(JSON.stringify(props, null, 2));

        this.logger.debug('[LLM] - Stream Step Change:', {
          text: props?.text,
          toolCalls: props?.toolCalls,
          toolResults: props?.toolResults,
          finishReason: props?.finishReason,
          usage: props?.usage,
          runId,
        });

        if (
          props?.response?.headers?.['x-ratelimit-remaining-tokens'] &&
          parseInt(props?.response?.headers?.['x-ratelimit-remaining-tokens'], 10) < 2000
        ) {
          this.logger.warn('Rate limit approaching, waiting 10 seconds', { runId });
          await delay(10 * 1000);
        }
      },
      onFinish: async (props: any) => {
        onFinish?.(JSON.stringify(props, null, 2));

        this.logger.debug('[LLM] - Stream Finished:', {
          text: props?.text,
          toolCalls: props?.toolCalls,
          toolResults: props?.toolResults,
          finishReason: props?.finishReason,
          usage: props?.usage,
          runId,
        });
      },
    };

    let schema: z.ZodType<Z> | Schema<Z> | undefined;

    if (experimental_output) {
      this.logger.debug('[LLM] - Using experimental output', {
        runId,
      });
      if (typeof (experimental_output as any).parse === 'function') {
        schema = experimental_output as z.ZodType<Z>;
        if (schema instanceof z.ZodArray) {
          schema = schema._def.type as z.ZodType<Z>;
        }
      } else {
        schema = jsonSchema(experimental_output as JSONSchema7) as Schema<Z>;
      }
    }

    return await streamText({
      messages,
      ...argsForExecute,
      experimental_telemetry: this.experimental_telemetry,
      experimental_output: schema
        ? Output.object({
            schema,
          })
        : undefined,
    });
  }

  async __streamObject<T>({
    messages,
    onStepFinish,
    onFinish,
    maxSteps = 5,
    tools,
    convertedTools,
    structuredOutput,
    runId,
    temperature,
    toolChoice = 'auto',
  }: LLMStreamObjectOptions<T>) {
    const model = this.#model;
    this.logger.debug(`[LLM] - Streaming structured output`, {
      runId,
      messages,
      maxSteps,
      tools: Object.keys(tools || convertedTools || {}),
    });

    const finalTools = convertedTools || this.convertTools({ tools, runId });

    const argsForExecute = {
      model,
      temperature,
      tools: {
        ...finalTools,
      },
      maxSteps,
      toolChoice,
      onStepFinish: async (props: any) => {
        onStepFinish?.(JSON.stringify(props, null, 2));

        this.logger.debug('[LLM] - Stream Step Change:', {
          text: props?.text,
          toolCalls: props?.toolCalls,
          toolResults: props?.toolResults,
          finishReason: props?.finishReason,
          usage: props?.usage,
          runId,
        });

        if (
          props?.response?.headers?.['x-ratelimit-remaining-tokens'] &&
          parseInt(props?.response?.headers?.['x-ratelimit-remaining-tokens'], 10) < 2000
        ) {
          this.logger.warn('Rate limit approaching, waiting 10 seconds', { runId });
          await delay(10 * 1000);
        }
      },
      onFinish: async (props: any) => {
        onFinish?.(JSON.stringify(props, null, 2));

        this.logger.debug('[LLM] - Stream Finished:', {
          text: props?.text,
          toolCalls: props?.toolCalls,
          toolResults: props?.toolResults,
          finishReason: props?.finishReason,
          usage: props?.usage,
          runId,
        });
      },
    };

    let schema: z.ZodType<T> | Schema<T>;
    let output = 'object';

    if (typeof (structuredOutput as any).parse === 'function') {
      schema = structuredOutput as z.ZodType<T>;
      if (schema instanceof z.ZodArray) {
        output = 'array';
        schema = schema._def.type as z.ZodType<T>;
      }
    } else {
      schema = jsonSchema(structuredOutput as JSONSchema7) as Schema<T>;
    }

    return streamObject({
      messages,
      ...argsForExecute,
      output: output as any,
      schema,
      experimental_telemetry: this.experimental_telemetry,
    });
  }

  async generate<Z extends ZodSchema | JSONSchema7 | undefined = undefined>(
    messages: string | string[] | CoreMessage[],
    {
      maxSteps = 5,
      onStepFinish,
      tools,
      convertedTools,
      runId,
      output = 'text',
      temperature,
    }: LLMStreamOptions<Z> = {},
  ): Promise<GenerateReturn<Z>> {
    const msgs = this.convertToMessages(messages);

    if (output === 'text') {
      return (await this.__text({
        messages: msgs,
        onStepFinish,
        maxSteps,
        tools,
        convertedTools,
        runId,
        temperature,
      })) as unknown as GenerateReturn<Z>;
    }

    return (await this.__textObject({
      messages: msgs,
      structuredOutput: output,
      onStepFinish,
      maxSteps,
      tools,
      convertedTools,
      runId,
    })) as unknown as GenerateReturn<Z>;
  }

  async stream<Z extends ZodSchema | JSONSchema7 | undefined = undefined>(
    messages: string | string[] | CoreMessage[],
    {
      maxSteps = 5,
      onFinish,
      onStepFinish,
      tools,
      convertedTools,
      runId,
      output = 'text',
      temperature,
    }: LLMStreamOptions<Z> = {},
  ) {
    const msgs = this.convertToMessages(messages);

    if (output === 'text') {
      return (await this.__stream({
        messages: msgs as CoreMessage[],
        onStepFinish,
        onFinish,
        maxSteps,
        tools,
        convertedTools,
        runId,
        temperature,
      })) as unknown as StreamReturn<Z>;
    }

    return (await this.__streamObject({
      messages: msgs as CoreMessage[],
      structuredOutput: output,
      onStepFinish,
      onFinish,
      maxSteps,
      tools,
      convertedTools,
      runId,
      temperature,
    })) as unknown as StreamReturn<Z>;
  }
}
