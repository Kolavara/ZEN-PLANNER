import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { goal, contextPageId } = await req.json()

    if (!goal) {
      throw new Error('Goal is required')
    }

    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY environment variable is missing')
    }

    let systemInstruction = 'You only output raw JSON arrays of strings.'
    let prompt = `You are a productivity expert. Break down the following large goal into exactly 3 actionable, concise steps.
Return the result ONLY as a raw JSON array of strings. Do not include any markdown formatting, backticks, or explanatory text.
Example output: ["Step 1 description", "Step 2 description", "Step 3 description"]

Goal: ${goal}`

    let isJsonObject = false

    if (contextPageId) {
      if (contextPageId.startsWith('day-')) {
        isJsonObject = true
        systemInstruction = 'You only output raw JSON objects mapping field keys to string values.'
        prompt = `You are an expert productivity assistant auto-filling a daily planner page.
Given the user's goal or intention for the day: "${goal}", generate a realistic and structured plan.
Return ONLY a raw JSON object (no markdown, no backticks).
The JSON object must use exactly these keys, mapping them to brief, concise string values:
- "mx-iu": (Important & Urgent task)
- "mx-inu": (Important & Not Urgent task)
- "mx-niu": (Not Important & Urgent task)
- "mx-ninu": (Not Important & Not Urgent task)
- "cat-do": (Main task to DO today)
- "cat-delegate": (Task to delegate)
- "cat-schedule": (Task to schedule)
- "cat-eliminate": (Task to eliminate)
- "sched-0" to "sched-13": (Hourly schedule starting from 6:00 AM to 7:00 PM. e.g. "sched-0" = 6AM. Leave empty string if no task for that hour)

Example output format:
{ "mx-iu": "Finish quarterly report", "sched-3": "9:00 AM - Deep work on report" }`
      } else if (contextPageId.startsWith('week-')) {
        isJsonObject = true
        systemInstruction = 'You only output raw JSON objects mapping field keys to string values.'
        prompt = `You are an expert productivity assistant auto-filling a weekly planner page.
Given the user's goal for the week: "${goal}", generate a realistic schedule and priorities.
Return ONLY a raw JSON object (no markdown).
The JSON object must use exactly these keys:
- "d0": (Monday's main focus/task)
- "d1": (Tuesday's main focus/task)
- "d2": (Wednesday's main focus/task)
- "d3": (Thursday's main focus/task)
- "d4": (Friday's main focus/task)
- "d5": (Saturday's main focus/task)
- "d6": (Sunday's main focus/task)
- "priorities": (Top 3 priorities for the week)`
      } else if (contextPageId.startsWith('goals-')) {
        isJsonObject = true
        systemInstruction = 'You only output raw JSON objects mapping field keys to string values.'
        prompt = `You are an expert productivity assistant auto-filling a monthly goal page.
Given the user's main goal: "${goal}", break it down.
Return ONLY a raw JSON object (no markdown).
Use keys: "goal-1", "goal-2", "goal-3" for sub-goals, "reward" for a milestone reward, and "action-1" to "action-5" for specific action steps.`
      } else if (contextPageId.startsWith('notes-')) {
        isJsonObject = true
        systemInstruction = 'You only output raw JSON objects.'
        prompt = `You are an assistant generating notes based on a prompt: "${goal}".
Return ONLY a raw JSON object containing exactly one key "content" mapping to the generated notes formatted with HTML tags like <br> and <b>.
Example: { "content": "Notes go here..." }`
      }
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        response_format: { type: isJsonObject ? 'json_object' : 'text' }
      }),
    })

    const data = await response.json()
    
    if (data.error) {
      console.error('Groq API Error:', data.error)
      throw new Error(`Groq API Error: ${data.error.message || 'Unknown error'}`)
    }

    const content = data.choices[0].message.content
    let result: any = []
    
    try {
      result = JSON.parse(content)
      if (!isJsonObject && !Array.isArray(result)) {
         result = [result] // wrap if weirdly object
      }
    } catch (parseError) {
      console.error('Failed to parse Groq response as JSON:', content)
      if (isJsonObject) {
        throw new Error('AI failed to return valid JSON mapping')
      }
      // Fallback
      result = content.split('\n').map((s: string) => s.replace(/^\d+\.\s*/, '').replace(/^- /, '').trim()).filter(Boolean).slice(0, 3)
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
