import {google} from "@ai-sdk/google"
import {streamText} from "ai"
import chalk from "chalk"
import { configuration } from "../../config/google.config"


export class AIService{
    constructor(){
        if(!configuration.googleAPIkey){
            throw new Error("GOOGLE_API_KEY is not set in env")
        }

        this.model = google(configuration.model, {apiKey: configuration.googleAPIkey, })
    }
        /**
         * Send a message and get streaming responser
         * @param {Array} messages
         * @param {Function} onChunk
         * @param {Object} tools
         * @param {Function} onToolCall
         * @returns {Promise<Object>}
         */

        async sendMessage(messages, onChunk, tools = undefined, onToolCall = null){
            try {
                const streamConfig = {
                    model:this.model,
                    messages:messages
                }

                const result = await streamText(streamConfig)

                let fullResponse = ""

                for await (const chunk of result.textStream){
                    fullResponse += chunk
                    if (onChunk) {
                        onChunk(chunk)
                    }
                }

                const fullResult = result

                return {
                    content:fullResponse,
                    finishReason:fullResult.finishReason,
                    usage:fullResult.usage
                }
            } catch (error) {
                console.error(chalk.red("AI Service Error: "), error.message)
                throw error
            }
        }

        /**
         * Get a non-streaming response
         * @param {Array} messages
         * @param {Object} tools
         * @returns {Promise<string>}
         */

        async getMessage(messages, tools=undefined){
            let fullResponse = ""
            await this.sendMessage(messages, (chunk)=>{
                fullResponse += chunk
            })

            return fullResponse
        }
}