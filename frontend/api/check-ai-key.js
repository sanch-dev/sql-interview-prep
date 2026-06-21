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

    const { data, error } = await supabase
      .from('profiles')
      .select('claude_api_key, id, email')
      .eq('id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      return res.json({
        hasKey: false,
        debug: {
          userId: user.id,
          error: error.message,
          code: error.code
        }
      })
    }

    const hasKey = data?.claude_api_key ? true : false
    res.json({
      hasKey,
      debug: {
        userId: user.id,
        rowExists: !!data,
        keyExists: !!data?.claude_api_key,
        email: data?.email
      }
    })
  } catch (err) {
    console.error('Error checking AI key:', err)
    res.status(500).json({ error: 'Failed to check AI key' })
  }
}
