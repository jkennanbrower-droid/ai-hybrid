import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function hiddenReasoning(userInput) {
  // Step 1 — ask the model to reason privately
  const thinkingPhase = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `
You are an analytical AI. Think step-by-step logically about the user's question, 
but do NOT reveal this reasoning to the user. 
Only respond with your reasoning in this phase.`,
      },
      { role: "user", content: userInput },
    ],
  });

  const internalThoughts = thinkingPhase.choices[0].message.content;

  console.log("\n🤫 (Internal reasoning, hidden from user):\n", internalThoughts);

  // Step 2 — ask model for the final user-facing answer
  const finalPhase = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `
Use your previous reasoning to give a short, clear answer.
Don't mention your reasoning or internal steps.`,
      },
      {
        role: "user",
        content: `Earlier reasoning: ${internalThoughts}\n\nNow give the final answer.`,
      },
    ],
  });

  console.log("\n💬 Final Answer:\n", finalPhase.choices[0].message.content);
}

hiddenReasoning("Why do leaves change color in autumn?");
