import OpenAI from 'openai';
import readline from 'readline';
import dotenv from 'dotenv';
import { tools, functions } from './tools.js';

dotenv.config();

const apiKey = process.env.OPENROUTER_API_KEY;

if (!apiKey) {
  console.error("Please set OPENROUTER_API_KEY environment variable. You can create a .env file.");
  process.exit(1);
}

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: apiKey,
});

const model = 'poolside/laguna-m.1:free';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const systemInstruction = `You are a helpful CLI AI assistant. Your goal is to help the user build projects, write code, and answer questions.
You have access to tools that allow you to read files, write files, create directories, and list directories.
When the user asks you to create a project or website, you should use your tools to generate the necessary files incrementally.
Always create the actual files required for the project rather than just giving code snippets.
IMPORTANT: Whenever generating a project or a website, you MUST place all generated files inside a directory named "scaler_clone". Do not put them in the root directory.`;

let messages = [
  { role: 'system', content: systemInstruction }
];

async function sendMessageWithRetry(messagesArray, maxRetries = 4) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      const response = await openai.chat.completions.create({
        model: model,
        messages: messagesArray,
        tools: tools,
        temperature: 0.2,
      });
      return response.choices[0].message;
    } catch (error) {
      const isTransient = [503, 429].includes(error.status) || error.status === 'UNAVAILABLE' || (error.message && (error.message.includes('503') || error.message.includes('429')));
      if (isTransient && attempt < maxRetries - 1) {
        attempt++;
        const waitTime = 3000 * attempt;
        console.log(`\n[Agent] API is busy/rate-limited. Retrying in ${waitTime/1000}s (Attempt ${attempt}/${maxRetries - 1})...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        throw error;
      }
    }
  }
}

async function processTurn(userInput) {
  try {
    messages.push({ role: 'user', content: userInput });
    
    let aiMessage = await sendMessageWithRetry(messages);
    messages.push(aiMessage);
    
    while (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
      for (const toolCall of aiMessage.tool_calls) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);
        
        console.log(`\n[Agent] Calling tool: ${functionName}(${JSON.stringify(functionArgs)})`);
        
        let toolResultStr;
        if (functions[functionName]) {
          try {
            const result = await functions[functionName](functionArgs);
            toolResultStr = String(result);
          } catch (err) {
            toolResultStr = `Error executing ${functionName}: ${err.message}`;
          }
        } else {
          toolResultStr = `Unknown tool: ${functionName}`;
        }
        
        console.log(`[Agent] Tool Result: ${toolResultStr.substring(0, 100)}${toolResultStr.length > 100 ? '...' : ''}`);
        
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          name: functionName,
          content: toolResultStr,
        });
      }
      
      aiMessage = await sendMessageWithRetry(messages);
      messages.push(aiMessage);
    }

    if (aiMessage.content) {
      console.log(`\n[Agent] ${aiMessage.content}\n`);
    }
  } catch (error) {
    console.error(`\n[Error] Failed to communicate with the agent:`, error.message);
  }
}

function promptUser() {
  rl.question('You: ', async (input) => {
    if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
      console.log('Goodbye!');
      rl.close();
      return;
    }
    
    await processTurn(input);
    promptUser();
  });
}

console.log("Welcome to the CLI Agent! Type your instruction below. Type 'exit' to quit.");
promptUser();