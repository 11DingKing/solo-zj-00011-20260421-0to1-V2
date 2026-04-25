import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../services/api'
import { PollDetail as PollDetailType } from '../types'
import Loading from '../components/Loading'

function PollDetail() {
  const { id } = useParams<{ id: string }>()
  const [poll, setPoll] = useState<PollDetailType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [voting, setVoting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (id) {
      fetchPoll(parseInt(id))
    }
  }, [id])

  const fetchPoll = async (pollId: number) => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.getPoll(pollId)
      if (data && !data.options) {
        data.options = []
      }
      setPoll(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  const handleVote = async () => {
    if (!poll || selectedOption === null) return

    try {
      setVoting(true)
      setError(null)
      setSuccess(null)
      await api.vote(poll.id, selectedOption)
      setSuccess('投票成功！')
      fetchPoll(poll.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : '投票失败')
    } finally {
      setVoting(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getPercentage = (votes: number, total: number) => {
    if (total === 0) return 0
    return Math.round((votes / total) * 100)
  }

  if (loading) {
    return <Loading />
  }

  if (!poll) {
    return (
      <div>
        <Link to="/" className="back-link">← 返回列表</Link>
        <div className="empty-state">
          <div className="icon">❌</div>
          <h3>投票不存在</h3>
          <p>该投票可能已被删除或链接无效</p>
        </div>
      </div>
    )
  }

  const canVote = !poll.is_closed && !poll.has_voted

  return (
    <div>
      <Link to="/" className="back-link">← 返回列表</Link>

      {error && (
        <div className="error-message">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {success && (
        <div className="success-message">
          {success}
          <button onClick={() => setSuccess(null)} style={{ float: 'right', background: 'none', border: 'none', color: '#16a34a', cursor: 'pointer', fontSize: '16px' }}>×</button>
        </div>
      )}

      <div className="poll-detail">
        <div className="status-badge">
          <span className={`badge ${poll.is_closed ? 'closed' : 'active'}`}>
            {poll.is_closed ? '🔒 已结束' : '🟢 进行中'}
          </span>
        </div>

        <h2>{poll.title}</h2>
        {poll.description && <p className="description">{poll.description}</p>}

        <div className="poll-meta">
          <span>📊 总票数: {poll.total_votes}</span>
          <span>⏰ 截止时间: {formatDate(poll.deadline)}</span>
          {poll.has_voted && <span style={{ color: '#16a34a' }}>✅ 您已投票</span>}
        </div>

        <div className="options-list">
          {poll.options.map((option) => {
            const percentage = getPercentage(option.votes, poll.total_votes)
            const isSelected = selectedOption === option.id

            return (
              <div
                key={option.id}
                className={`option-card ${!canVote ? 'disabled' : ''} ${isSelected ? 'selected' : ''}`}
                onClick={() => canVote && setSelectedOption(option.id)}
              >
                <div className="option-header">
                  <span className="option-text">{option.text}</span>
                  <span className="option-votes">{option.votes} 票</span>
                </div>

                {poll.total_votes > 0 && (
                  <>
                    <div className="vote-info">
                      <span>{percentage}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="fill" style={{ width: `${percentage}%` }}></div>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>

        {canVote && (
          <div style={{ marginTop: '24px' }}>
            <button
              className="btn btn-primary"
              onClick={handleVote}
              disabled={selectedOption === null || voting}
              style={{ width: '100%' }}
            >
              {voting ? '投票中...' : selectedOption !== null ? '确认投票' : '请选择一个选项'}
            </button>
          </div>
        )}

        {poll.is_closed && (
          <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#fef0f0', borderRadius: '8px', textAlign: 'center', color: '#dc2626' }}>
            🔒 该投票已截止，无法继续投票
          </div>
        )}

        {poll.has_voted && !poll.is_closed && (
          <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#f0fdf4', borderRadius: '8px', textAlign: 'center', color: '#16a34a' }}>
            ✅ 您已完成投票，每个用户只能投票一次
          </div>
        )}
      </div>
    </div>
  )
}

export default PollDetail
