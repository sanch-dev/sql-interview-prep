import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import '../styles/ai-chat.css'

export default function AIChat({ question, currentSQL, queryResult }) {
  const { user, session } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [hasApiKey, setHasApiKey] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    // Check if user has API key configured
    if (user && session?.access_token) checkApiKey()
  }, [user, session])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const checkApiKey = async () => {
    try {
      if (!session?.access_token) {
        console.error('No auth session')
        return
      }

      const response = await fetch('/api/check-ai-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
      })
      const data = await response.json()
      setHasApiKey(data.hasKey)
    } catch (err) {
      console.error('Failed to check API key:', err)
    }
  }

  const handleSendMessage = async () => {
    if (!input.trim()) return

    const userMessage = input.trim()
    setInput('')
    setMessages([...messages, { role: 'user', content: userMessage }])
    setLoading(true)

    try {
      if (!session?.access_token) {
        setMessages((prev) => [...prev, { role: 'assistant', content: '❌ Authentication required' }])
        setLoading(false)
        return
      }

      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          message: userMessage,
          question: {
            id: question.id,
            title: question.title,
            schema: question.schema,
            description: question.description,
          },
          currentSQL,
          queryResult,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: '❌ ' + (data.error || 'Failed to get response') },
        ])
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.response }])
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '❌ Network error: ' + err.message },
      ])
    } finally {
      setLoading(false)
    }
  }

  if (!hasApiKey) {
    return (
      <div className="ai-chat-container">
        <div className="ai-chat-header">
          <h3>💡 Ask Claude</h3>
        </div>
        <div className="ai-chat-empty">
          <p>Configure your Claude API key in Settings to use AI assistance.</p>
          <p className="ai-chat-hint">Get free credits at console.anthropic.com</p>
        </div>
      </div>
    )
  }

  return (
    <div className="ai-chat-container">
      <div className="ai-chat-header">
        <h3>💡 Ask Claude</h3>
        <p className="ai-chat-subtitle">Get hints, not answers</p>
      </div>

      <div className="ai-chat-messages">
        {messages.length === 0 && (
          <div className="ai-chat-welcome">
            <p>👋 Hi! I'm here to help you learn.</p>
            <ul>
              <li>"I'm stuck on this query"</li>
              <li>"Why doesn't this work?"</li>
              <li>"Explain window functions"</li>
              <li>"How can I optimize this?"</li>
            </ul>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`ai-message ai-message-${msg.role}`}>
            <div className="ai-message-content">{msg.content}</div>
          </div>
        ))}

        {loading && (
          <div className="ai-message ai-message-assistant">
            <div className="ai-message-content ai-typing">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="ai-chat-input-area">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
              handleSendMessage()
            }
          }}
          placeholder="Ask for help... (Ctrl+Enter to send)"
          className="ai-chat-input"
          disabled={loading}
        />
        <button
          onClick={handleSendMessage}
          disabled={loading || !input.trim()}
          className="ai-chat-send"
        >
          {loading ? '...' : '→'}
        </button>
      </div>
    </div>
  )
}
