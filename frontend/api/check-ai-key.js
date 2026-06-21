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
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('claude_api_key')
      .eq('id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    const hasKey = data?.claude_api_key ? true : false
    res.json({ hasKey })
  } catch (err) {
    console.error('Error checking AI key:', err)
    res.status(500).json({ error: 'Failed to check AI key' })
  }
}
