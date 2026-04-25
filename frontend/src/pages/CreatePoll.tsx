import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../services/api'
import { CreatePollRequest } from '../types'

function CreatePoll() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [options, setOptions] = useState<string[]>(['', ''])
  const [deadline, setDeadline] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const getMinDate = () => {
    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    return now.toISOString().slice(0, 16)
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!title.trim()) {
      newErrors.title = '请输入投票标题'
    } else if (title.length > 200) {
      newErrors.title = '标题不能超过200个字符'
    }

    if (description.length > 1000) {
      newErrors.description = '描述不能超过1000个字符'
    }

    const validOptions = options.filter(o => o.trim())
    if (validOptions.length < 2) {
      newErrors.options = '至少需要2个有效选项'
    } else if (validOptions.length > 8) {
      newErrors.options = '最多只能有8个选项'
    }

    if (!deadline) {
      newErrors.deadline = '请选择截止时间'
    } else if (new Date(deadline) <= new Date()) {
      newErrors.deadline = '截止时间必须在未来'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    const validOptions = options.filter(o => o.trim())
    const request: CreatePollRequest = {
      title: title.trim(),
      description: description.trim(),
      options: validOptions.map(text => ({ text: text.trim() })),
      deadline: new Date(deadline).toISOString(),
    }

    try {
      setLoading(true)
      setError(null)
      const poll = await api.createPoll(request)
      navigate(`/poll/${poll.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败')
    } finally {
      setLoading(false)
    }
  }

  const addOption = () => {
    if (options.length < 8) {
      setOptions([...options, ''])
    }
  }

  const removeOption = (index: number) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index)
      setOptions(newOptions)
    }
  }

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
  }

  return (
    <div>
      <Link to="/" className="back-link">← 返回列表</Link>

      {error && (
        <div className="error-message">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="poll-detail">
        <h2 style={{ marginBottom: '24px' }}>创建新投票</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">投票标题 *</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：今天中午吃什么？"
              maxLength={200}
            />
            {errors.title && <p className="error">{errors.title}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="description">描述（可选）</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="添加一些关于这个投票的说明..."
              maxLength={1000}
            />
            {errors.description && <p className="error">{errors.description}</p>}
          </div>

          <div className="form-group">
            <label>投票选项 *</label>
            {options.map((option, index) => (
              <div key={index} className="option-item">
                <input
                  type="text"
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  placeholder={`选项 ${index + 1}`}
                  maxLength={200}
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    className="btn btn-remove"
                    onClick={() => removeOption(index)}
                  >
                    删除
                  </button>
                )}
              </div>
            ))}
            {options.length < 8 && (
              <button type="button" className="add-option" onClick={addOption}>
                + 添加选项（最多8个）
              </button>
            )}
            {errors.options && <p className="error">{errors.options}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="deadline">截止时间 *</label>
            <input
              type="datetime-local"
              id="deadline"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              min={getMinDate()}
            />
            {errors.deadline && <p className="error">{errors.deadline}</p>}
          </div>

          <div style={{ marginTop: '32px', display: 'flex', gap: '12px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/')}
            >
              取消
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? '创建中...' : '创建投票'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreatePoll
