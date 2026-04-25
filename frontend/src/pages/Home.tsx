import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { Poll } from '../types'
import Loading from '../components/Loading'
import EmptyState from '../components/EmptyState'

function Home() {
  const [polls, setPolls] = useState<Poll[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetchPolls()
  }, [])

  const fetchPolls = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.getPolls()
      setPolls(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const isExpired = (deadline: string) => {
    return new Date() > new Date(deadline)
  }

  if (loading) {
    return <Loading />
  }

  return (
    <div>
      <div className="page-header">
        <h2>所有投票</h2>
        <button className="btn btn-primary" onClick={() => navigate('/create')}>
          + 创建投票
        </button>
      </div>

      {error && (
        <div className="error-message">
          <span>{error}</span>
          <button onClick={fetchPolls}>重试</button>
        </div>
      )}

      {!loading && polls.length === 0 ? (
        <EmptyState
          icon="📭"
          title="暂无投票"
          description="点击上方按钮创建第一个投票吧！"
        />
      ) : (
        <div className="poll-list">
          {polls.map((poll) => (
            <div
              key={poll.id}
              className="poll-card"
              onClick={() => navigate(`/poll/${poll.id}`)}
            >
              <h3>{poll.title}</h3>
              {poll.description && (
                <p className="description">{poll.description}</p>
              )}
              <div className="meta">
                <span className={`badge ${isExpired(poll.deadline) ? 'closed' : 'active'}`}>
                  {isExpired(poll.deadline) ? '🔒 已结束' : '🟢 进行中'}
                </span>
                <span>📊 总票数: {poll.total_votes}</span>
                <span>⏰ 截止: {formatDate(poll.deadline)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Home
