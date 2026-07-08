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

    let systemInstruction = 'You only output raw JSON objects.'
    let prompt = ''
    let isAutoFill = false

    if (contextPageId) {
      if (contextPageId.startsWith('day-')) {
        isAutoFill = true
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
- "desc-0" to "desc-13": (Hourly schedule starting from 6:00 AM to 7:00 PM. e.g. "desc-0" = 6AM, "desc-1" = 7AM, etc. Leave empty string if no task for that hour)

Example output format:
{ "mx-iu": "Finish quarterly report", "desc-3": "9:00 AM - Deep work on report" }`
      } else if (contextPageId.startsWith('week-')) {
        isAutoFill = true
        systemInstruction = 'You only output raw JSON objects mapping field keys to string values.'
        prompt = `You are an expert productivity assistant auto-filling a weekly planner page.
Given the user's goal for the week: "${goal}", generate a realistic schedule and priorities.
Return ONLY a raw JSON object (no markdown).
The JSON object must use exactly these keys:
- "day-0": (Monday's main focus/task)
- "day-1": (Tuesday's main focus/task)
- "day-2": (Wednesday's main focus/task)
- "day-3": (Thursday's main focus/task)
- "day-4": (Friday's main focus/task)
- "day-5": (Saturday's main focus/task)
- "day-6": (Sunday's main focus/task)
- "focus": (Main focus/priorities for the week)`
      } else if (contextPageId.startsWith('month-goals-')) {
        isAutoFill = true
        systemInstruction = 'You only output raw JSON objects mapping field keys to string values.'
        prompt = `You are an expert productivity assistant auto-filling a monthly goal page.
Given the user's main goal: "${goal}", break it down.
Return ONLY a raw JSON object (no markdown).
The JSON object must use exactly these keys:
- "goal-1", "goal-2", "goal-3": (the top 3 goals)
- "action-1" to "action-8": (specific action items)
- "notes": (monthly notes and ideas)
- "reflection": (monthly reflection thoughts)`
      } else if (contextPageId.startsWith('notes-')) {
        isAutoFill = true
        systemInstruction = 'You only output raw JSON objects.'
        prompt = `You are an assistant generating notes based on a prompt: "${goal}".
Return ONLY a raw JSON object containing exactly one key "content" mapping to the generated notes formatted with HTML tags like <br> and <b>.
Example: { "content": "Notes go here..." }`
      } else if (contextPageId.startsWith('habit-')) {
        isAutoFill = true
        systemInstruction = 'You only output raw JSON objects mapping field keys to string values.'
        prompt = `You are a habit-building expert. Based on the user's goal: "${goal}", suggest 12 specific daily habits that would help achieve this goal.
Return ONLY a raw JSON object (no markdown) with these exact keys:
- "name-0" to "name-11": (each a short, actionable daily habit name, max 25 characters)

Good habits are specific and measurable. Example for goal "get fit":
{ "name-0": "30 min morning run", "name-1": "Drink 2L water", "name-2": "No sugar after 6PM", "name-3": "10 min stretching", "name-4": "Track calories", "name-5": "8 hours sleep", "name-6": "Take stairs not lift", "name-7": "Meal prep Sunday", "name-8": "15 min walk after lunch", "name-9": "No phone in bed", "name-10": "Morning weigh-in", "name-11": "Evening reflection" }`
      } else if (contextPageId.match(/^month-\d+$/)) {
        isAutoFill = true
        const monthNum = parseInt(contextPageId.split('-')[1])
        const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December']
        const monthName = monthNames[(monthNum - 1) % 12]
        const daysInMonth = [31,28,31,30,31,30,31,31,30,31,30,31][(monthNum - 1) % 12]
        systemInstruction = 'You only output raw JSON objects mapping field keys to string values.'
        prompt = `You are a planning assistant. The user wants to plan their month of ${monthName} around this goal: "${goal}".
Return ONLY a raw JSON object (no markdown). Use these keys:
- "cell-1" to "cell-${daysInMonth}": (short event/task for that day of the month. Use empty string "" for days with nothing planned. Plan at least 8-12 days with meaningful tasks spread across the month.)
- "notes": (brief monthly notes or reminders)

Be realistic — don't overschedule. Leave rest days empty. Keep each entry under 30 characters.`
      }
    }

    if (!isAutoFill) {
      throw new Error('AI is not available on this page type')
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
        response_format: { type: 'json_object' }
      }),
    })

    const data = await response.json()
    
    if (data.error) {
      console.error('Groq API Error:', data.error)
      throw new Error(`Groq API Error: ${data.error.message || 'Unknown error'}`)
    }

    const content = data.choices[0].message.content
    let result: any = {}
    
    try {
      result = JSON.parse(content)
    } catch (parseError) {
      console.error('Failed to parse Groq response as JSON:', content)
      throw new Error('AI failed to return valid JSON')
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
