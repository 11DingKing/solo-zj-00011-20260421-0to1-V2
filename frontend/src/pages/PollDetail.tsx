import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../services/api";
import { PollDetail as PollDetailType } from "../types";
import Loading from "../components/Loading";

function PollDetail() {
  const { id } = useParams<{ id: string }>();
  const [poll, setPoll] = useState<PollDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [voting, setVoting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<string>("");
  const [isCountdownExpired, setIsCountdownExpired] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [displayPercentages, setDisplayPercentages] = useState<
    Record<number, number>
  >({});
  const pollRef = useRef<PollDetailType | null>(null);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const animationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const fetchPoll = useCallback(
    async (pollId: number, isRefresh: boolean = false) => {
      try {
        if (!isRefresh) {
          setLoading(true);
        }
        setError(null);
        const data = await api.getPoll(pollId);
        if (data && !data.options) {
          data.options = [];
        }
        setPoll(data);
        pollRef.current = data;

        const percentages: Record<number, number> = {};
        data.options.forEach((option) => {
          percentages[option.id] = 0;
        });
        setDisplayPercentages(percentages);

        setAnimating(true);
        setTimeout(() => {
          const newPercentages: Record<number, number> = {};
          const totalVoters = data.total_voters > 0 ? data.total_voters : 0;
          data.options.forEach((option) => {
            newPercentages[option.id] = getPercentage(
              option.votes,
              totalVoters,
            );
          });
          setDisplayPercentages(newPercentages);
        }, 100);

        animationTimeoutRef.current = setTimeout(() => {
          setAnimating(false);
        }, 900);
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载失败");
      } finally {
        if (!isRefresh) {
          setLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (id) {
      fetchPoll(parseInt(id));
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, [id, fetchPoll]);

  useEffect(() => {
    if (!poll) return;

    const isClosed = poll.is_closed || isCountdownExpired;
    if (!isClosed && !poll.has_voted) {
      refreshIntervalRef.current = setInterval(() => {
        if (pollRef.current) {
          const now = new Date();
          const deadline = new Date(pollRef.current.deadline);
          if (now >= deadline) {
            if (refreshIntervalRef.current) {
              clearInterval(refreshIntervalRef.current);
              refreshIntervalRef.current = null;
            }
          } else {
            fetchPoll(pollRef.current.id, true);
          }
        }
      }, 10000);
    } else {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [poll, isCountdownExpired, fetchPoll]);

  useEffect(() => {
    if (!poll) return;

    const updateCountdown = () => {
      const now = new Date();
      const deadline = new Date(poll.deadline);
      const diff = deadline.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdown("00:00:00");
        setIsCountdownExpired(true);
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        if (pollRef.current) {
          setPoll((prev) => (prev ? { ...prev, is_closed: true } : null));
        }
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setCountdown(
          `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`,
        );
      }
    };

    updateCountdown();
    countdownIntervalRef.current = setInterval(updateCountdown, 1000);

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [poll]);

  const getPercentage = (votes: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((votes / total) * 100);
  };

  const handleVote = async () => {
    if (!poll) return;

    let optionIds: number[] = [];
    if (poll.poll_type === "single") {
      if (selectedOption === null) return;
      optionIds = [selectedOption];
    } else {
      if (selectedOptions.length === 0) return;
      optionIds = selectedOptions;
    }

    try {
      setVoting(true);
      setError(null);
      setSuccess(null);
      await api.vote(poll.id, optionIds);
      setSuccess("投票成功！");
      fetchPoll(poll.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "投票失败");
    } finally {
      setVoting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const toggleOption = (optionId: number) => {
    if (!poll) return;

    if (poll.poll_type === "single") {
      setSelectedOption(optionId);
    } else {
      const isSelected = selectedOptions.includes(optionId);
      if (isSelected) {
        setSelectedOptions(selectedOptions.filter((id) => id !== optionId));
      } else {
        if (selectedOptions.length < poll.max_choices) {
          setSelectedOptions([...selectedOptions, optionId]);
        }
      }
    }
  };

  const isOptionDisabled = (optionId: number) => {
    if (!poll) return true;
    if (poll.poll_type === "single") return false;
    if (selectedOptions.includes(optionId)) return false;
    return selectedOptions.length >= poll.max_choices;
  };

  if (loading) {
    return <Loading />;
  }

  if (!poll) {
    return (
      <div>
        <Link to="/" className="back-link">
          ← 返回列表
        </Link>
        <div className="empty-state">
          <div className="icon">❌</div>
          <h3>投票不存在</h3>
          <p>该投票可能已被删除或链接无效</p>
        </div>
      </div>
    );
  }

  const canVote = !poll.is_closed && !isCountdownExpired && !poll.has_voted;
  const isWarning = countdown.startsWith("00:") && !isCountdownExpired;
  const totalForPercentage =
    poll.poll_type === "multiple" ? poll.total_voters : poll.total_votes;

  return (
    <div>
      <Link to="/" className="back-link">
        ← 返回列表
      </Link>

      {error && (
        <div className="error-message">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {success && (
        <div className="success-message">
          {success}
          <button
            onClick={() => setSuccess(null)}
            style={{
              float: "right",
              background: "none",
              border: "none",
              color: "#16a34a",
              cursor: "pointer",
              fontSize: "16px",
            }}
          >
            ×
          </button>
        </div>
      )}

      <div className="poll-detail">
        <div className="status-badge">
          <span
            className={`badge ${poll.is_closed || isCountdownExpired ? "closed" : "active"}`}
          >
            {poll.is_closed || isCountdownExpired ? "🔒 已结束" : "🟢 进行中"}
          </span>
        </div>

        {!poll.is_closed && !isCountdownExpired && (
          <div className={`countdown ${isWarning ? "warning" : ""}`}>
            <span className="countdown-text">⏰ 距离结束:</span>
            <span className="countdown-time">{countdown}</span>
          </div>
        )}

        <h2>{poll.title}</h2>
        {poll.description && <p className="description">{poll.description}</p>}

        <div className="poll-meta">
          <span>📊 总票数: {poll.total_votes}</span>
          <span>👥 参与人数: {poll.total_voters}</span>
          <span>
            📋{" "}
            {poll.poll_type === "single"
              ? "单选"
              : `多选(最多${poll.max_choices}项)`}
          </span>
          <span>⏰ 截止时间: {formatDate(poll.deadline)}</span>
          {poll.has_voted && (
            <span style={{ color: "#16a34a" }}>✅ 您已投票</span>
          )}
        </div>

        <div className="options-list">
          {poll.options.map((option) => {
            const percentage =
              totalForPercentage > 0
                ? getPercentage(option.votes, totalForPercentage)
                : 0;
            const displayPercentage = displayPercentages[option.id] || 0;
            const isSelected =
              poll.poll_type === "single"
                ? selectedOption === option.id
                : selectedOptions.includes(option.id);
            const isDisabled = isOptionDisabled(option.id);

            return (
              <div
                key={option.id}
                className={`option-card ${!canVote ? "disabled" : ""} ${isSelected ? "selected" : ""} ${isDisabled && !isSelected ? "disabled-checkbox" : ""}`}
                onClick={() =>
                  canVote && !isDisabled && toggleOption(option.id)
                }
              >
                <div className="option-header">
                  <span style={{ display: "flex", alignItems: "center" }}>
                    {canVote ? (
                      poll.poll_type === "single" ? (
                        <input
                          type="radio"
                          name="poll-option"
                          checked={isSelected}
                          onChange={() => toggleOption(option.id)}
                          disabled={!canVote}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOption(option.id)}
                          disabled={isDisabled && !isSelected}
                          onClick={(e) => e.stopPropagation()}
                        />
                      )
                    ) : null}
                    <span className="option-text">{option.text}</span>
                  </span>
                  <span className="option-votes">{option.votes} 票</span>
                </div>

                {totalForPercentage > 0 && (
                  <>
                    <div className="vote-info">
                      <span>{percentage}%</span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className={`fill ${animating ? "animate" : ""}`}
                        style={{
                          width: `${displayPercentage}%`,
                        }}
                      ></div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {canVote && (
          <div style={{ marginTop: "24px" }}>
            <button
              className="btn btn-primary"
              onClick={handleVote}
              disabled={
                voting ||
                (poll.poll_type === "single"
                  ? selectedOption === null
                  : selectedOptions.length === 0)
              }
              style={{ width: "100%" }}
            >
              {voting
                ? "投票中..."
                : poll.poll_type === "single"
                  ? selectedOption !== null
                    ? "确认投票"
                    : "请选择一个选项"
                  : selectedOptions.length > 0
                    ? `确认投票 (已选 ${selectedOptions.length}/${poll.max_choices})`
                    : `请选择选项 (最多${poll.max_choices}项)`}
            </button>
          </div>
        )}

        {(poll.is_closed || isCountdownExpired) && (
          <div
            style={{
              marginTop: "24px",
              padding: "16px",
              backgroundColor: "#fef0f0",
              borderRadius: "8px",
              textAlign: "center",
              color: "#dc2626",
            }}
          >
            🔒 该投票已截止，无法继续投票
          </div>
        )}

        {poll.has_voted && !poll.is_closed && !isCountdownExpired && (
          <div
            style={{
              marginTop: "24px",
              padding: "16px",
              backgroundColor: "#f0fdf4",
              borderRadius: "8px",
              textAlign: "center",
              color: "#16a34a",
            }}
          >
            ✅ 您已完成投票，每个用户只能投票一次
          </div>
        )}
      </div>
    </div>
  );
}

export default PollDetail;
