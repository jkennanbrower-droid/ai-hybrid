import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function structuredReasoning(userInput) {
  const prompt = `
You are a logical AI that must always reason step-by-step before answering.
Follow this structure:
1. Understand the question.
2. Break it into smaller parts.
3. Reason through each part logically.
4. Provide a clear final answer.

Question: ${userInput}
`;

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
  });

  console.log(completion.choices[0].message.content);
}

structuredReasoning("Why does the sky look blue?");
