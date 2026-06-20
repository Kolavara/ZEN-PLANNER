import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { goal } = await req.json()

    if (!goal) {
      throw new Error('Goal is required')
    }

    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY environment variable is missing')
    }

    const prompt = `You are a productivity expert. Break down the following large goal into exactly 3 actionable, concise steps.
Return the result ONLY as a raw JSON array of strings. Do not include any markdown formatting, backticks, or explanatory text.
Example output: ["Step 1 description", "Step 2 description", "Step 3 description"]

Goal: ${goal}`

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [
          { role: 'system', content: 'You only output raw JSON arrays of strings.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
      }),
    })

    const data = await response.json()
    
    if (data.error) {
      console.error('Groq API Error:', data.error)
      throw new Error(`Groq API Error: ${data.error.message || 'Unknown error'}`)
    }

    const content = data.choices[0].message.content
    let steps = []
    
    try {
      steps = JSON.parse(content)
      if (!Array.isArray(steps)) throw new Error('Not an array')
    } catch (parseError) {
      console.error('Failed to parse Groq response as JSON:', content)
      // Fallback: split by newlines if it failed to return valid JSON
      steps = content.split('\n').map((s: string) => s.replace(/^\d+\.\s*/, '').replace(/^- /, '').trim()).filter(Boolean).slice(0, 3)
    }

    return new Response(
      JSON.stringify(steps),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
