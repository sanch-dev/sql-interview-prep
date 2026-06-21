import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import '../styles/settings-modal.css'

export default function SettingsModal({ isOpen, onClose }) {
  const { user } = useAuth()
  const [apiKey, setApiKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (isOpen && user) {
      loadApiKey()
    }
  }, [isOpen, user])

  const loadApiKey = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('claude_api_key')
        .eq('id', user.id)
        .single()

      if (data?.claude_api_key) {
        setApiKey(data.claude_api_key)
      }
    } catch (err) {
      console.error('Failed to load API key:', err)
    }
  }

  const saveApiKey = async () => {
    if (!apiKey.trim()) {
      setMessage('API key cannot be empty')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: user.id, claude_api_key: apiKey })

      if (error) throw error
      setMessage('✅ API key saved successfully!')
      setTimeout(() => {
        setMessage('')
        onClose()
      }, 2000)
    } catch (err) {
      setMessage('❌ Failed to save API key: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const deleteApiKey = async () => {
    if (!confirm('Remove Claude API key?')) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ claude_api_key: null })
        .eq('id', user.id)

      if (error) throw error
      setApiKey('')
      setMessage('✅ API key removed')
    } catch (err) {
      setMessage('❌ Failed to remove API key')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>AI Settings</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="settings-content">
          <div className="setting-group">
            <label>Claude API Key</label>
            <p className="setting-hint">
              Get your free API key from <a href="https://console.anthropic.com/account/keys" target="_blank" rel="noopener noreferrer">console.anthropic.com</a>
            </p>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-..."
              className="api-key-input"
            />
            {apiKey && <p className="key-stored">✓ Key stored securely</p>}
          </div>

          {message && (
            <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
              {message}
            </div>
          )}

          <div className="settings-actions">
            <button
              onClick={saveApiKey}
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Saving...' : 'Save Key'}
            </button>
            {apiKey && (
              <button
                onClick={deleteApiKey}
                disabled={loading}
                className="btn-secondary"
              >
                Remove Key
              </button>
            )}
          </div>

          <div className="settings-info">
            <h4>What is this?</h4>
            <p>
              Your API key lets you use Claude AI in the SQL editor to:
            </p>
            <ul>
              <li>Get hints when you're stuck (not answers)</li>
              <li>Understand why your queries fail</li>
              <li>Learn SQL concepts and patterns</li>
              <li>Get feedback on your solution</li>
            </ul>
            <p className="security-note">
              🔒 Your key is stored securely and never shared.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
