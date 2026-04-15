import OpenAI from 'openai';
import 'dotenv/config';

console.log('env', typeof process.env.OPENAI_API_KEY);
console.log('value exists?', !!process.env.OPENAI_API_KEY);

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function test() {
  const response = await client.responses.create({
    model: 'gpt-5',
    input: 'Say hello in 3 words.',
  });

  console.log(response.output_text);
}

test().catch((error) => {
  console.error(error);
});
