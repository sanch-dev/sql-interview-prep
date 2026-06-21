const { createClient } = require('@supabase/supabase-js')

const ANTHROPIC_API_KEY_HEADER = 'x-api-key'

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const token = authHeader.split(' ')[1]
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { message, question, currentSQL, queryResult } = req.body

  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase env vars not set')
      return res.status(500).json({ error: 'Server configuration error' })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('claude_api_key')
      .eq('id', user.id)
      .single()

    if (error || !data?.claude_api_key) {
      return res.status(400).json({ error: 'No API key configured' })
    }

    const userApiKey = data.claude_api_key

    // Build the system prompt for learning-focused AI
    const systemPrompt = `You are a SQL learning coach. Your goal is to TEACH, not to SOLVE.

When helping a user:
1. Ask questions to guide their thinking
2. Explain WHY something works or fails
3. Never give complete solutions - instead guide them to find it
4. Point out patterns and concepts they should learn
5. Give hints, not answers

Current question context:
- Title: ${question.title}
- Schema available: ${question.schema.substring(0, 500)}...

Important rules:
- If they ask "write a query for X", ask them questions instead: "What columns do you need? What's the condition?"
- If their query is wrong, don't fix it - explain what's wrong: "You're filtering AFTER grouping, but that doesn't work. What clause should you use instead?"
- If they ask about a concept, teach it with simple examples
- Always be encouraging and supportive`

    const messages = [
      {
        role: 'user',
        content: buildContextualPrompt(message, question, currentSQL, queryResult),
      },
    ]

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': userApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Anthropic API error:', data)
      if (data.error?.message?.includes('invalid api key')) {
        return res.status(400).json({ error: 'Invalid Claude API key' })
      }
      throw new Error(data.error?.message || 'Failed to get Claude response')
    }

    const aiResponse = data.content[0]?.text || 'No response'

    res.json({ response: aiResponse })
  } catch (err) {
    console.error('Error in AI chat:', err)
    res.status(500).json({ error: err.message || 'Failed to process request' })
  }
}

function buildContextualPrompt(message, question, currentSQL, queryResult) {
  let prompt = `User: ${message}\n\n`

  if (currentSQL) {
    prompt += `Their current query:\n\`\`\`sql\n${currentSQL}\n\`\`\`\n\n`
  }

  if (queryResult) {
    if (queryResult.error) {
      prompt += `Query error: ${queryResult.error}\n\n`
    } else if (queryResult.rows) {
      prompt += `Query returned ${queryResult.rows.length} rows\n\n`
    }
  }

  prompt += `Question description: ${question.description}`

  return prompt
}
