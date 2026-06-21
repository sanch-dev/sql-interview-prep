const { createClient } = require('@supabase/supabase-js')

module.exports = async (req, res) => {
  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const token = authHeader.split(' ')[1]
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

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

    console.log('Checking API key for user:', user.id)

    const { data, error } = await supabase
      .from('profiles')
      .select('claude_api_key')
      .eq('id', user.id)
      .single()

    console.log('Query result:', { data, error })

    if (error && error.code !== 'PGRST116') {
      console.error('Database query error:', error)
      throw error
    }

    const hasKey = data?.claude_api_key ? true : false
    console.log('Has API key:', hasKey, 'Key value:', data?.claude_api_key?.substring(0, 20))
    res.json({ hasKey })
  } catch (err) {
    console.error('Error checking AI key:', err)
    res.status(500).json({ error: 'Failed to check AI key' })
  }
}
