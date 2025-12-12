import { google } from "@ai-sdk/google";
import { streamText, generateObject } from "ai";
import { config } from "../../../config/google.config.js";
import chalk from "chalk";


export class AIService {
  constructor() {
    if (!config.googleApiKey) {
      throw new Error("GOOGLE_API_KEY is not set in environment variables");
    }
    
    this.model = google(config.model, {
      apiKey: config.googleApiKey,
    });
  }

  /**
   * Send a message and get streaming response
   * @param {Array} messages - Array of message objects {role, content}
   * @param {Function} onChunk - Callback for each text chunk
   * @param {Object} tools - Optional tools object
   * @param {Function} onToolCall - Callback for tool calls
   * @returns {Promise<Object>} Full response with content, tool calls, and usage
   */
  async sendMessage(messages, onChunk, tools = undefined, onToolCall = null) {
    try {
      const streamConfig = {
        model: this.model,
        messages: messages
      }

      if (Array.isArray(tools) && tools.length > 0) {
          streamConfig.tools = tools;
          streamConfig.maxSteps = 5;
          console.log(chalk.gray(`[DEBUG]: Tools enabled: ${tools.length}`));
      }

      const result = streamText(streamConfig);

      let fullResponse = ""

      for await (const chunk of result.textStream){
        fullResponse += chunk
        if (onChunk){
          onChunk(chunk)
        }
      }

      const { finishReason, usage, steps } = result;

      const toolCalls = []
      const toolResults = []

      if(steps && Array.isArray(steps)){
        for(const step of steps){
          if(step.toolCalls && step.toolCalls.length > 0){
            for(const toolCall of step.toolCalls){
              toolCalls.push(toolCall)

              if(onToolCall){
                onToolCall(toolCall)
              }
            }
          }

          if(step.toolResults && step.toolResults.length > 0){
            toolResults.push(...step.toolResults)
          }
        }
      }

      return {
        content: fullResponse,
        finishResponse: finishReason,
        usage: usage,
        toolCalls,
        toolResults,
        steps
      }
    } catch (error) {
      console.error(chalk.red("AI Service Error: "), error.message)
      throw error
    }
  }

  /**
   * Get a non-streaming response
   * @param {Array} messages - Array of message objects
   * @param {Object} tools - Optional tools
   * @returns {Promise<string>} Response text
   */
  async getMessage(messages, tools = undefined) {
    let fullResponse = ""
    const result = await this.sendMessage(messages, (chunk) => {
      fullResponse += chunk
    }, tools)

    return result.content
  }
}