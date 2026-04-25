import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { Poll } from "../types";
import Loading from "../components/Loading";
import EmptyState from "../components/EmptyState";

type TabType = "active" | "closed";

function Home() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("active");
  const navigate = useNavigate();

  useEffect(() => {
    fetchPolls();
  }, []);

  const fetchPolls = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getPolls();
      setPolls(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isExpired = (deadline: string) => {
    return new Date() > new Date(deadline);
  };

  const activePolls = polls.filter((poll) => !isExpired(poll.deadline));
  const closedPolls = polls
    .filter((poll) => isExpired(poll.deadline))
    .sort(
      (a, b) => new Date(b.deadline).getTime() - new Date(a.deadline).getTime(),
    );

  const displayPolls = activeTab === "active" ? activePolls : closedPolls;

  if (loading) {
    return <Loading />;
  }

  return (
    <div>
      <div className="page-header">
        <h2>所有投票</h2>
        <button className="btn btn-primary" onClick={() => navigate("/create")}>
          + 创建投票
        </button>
      </div>

      <div className="tabs">
        <button
          className={`tab-btn ${activeTab === "active" ? "active" : ""}`}
          onClick={() => setActiveTab("active")}
        >
          🟢 进行中
          <span className="tab-count">{activePolls.length}</span>
        </button>
        <button
          className={`tab-btn ${activeTab === "closed" ? "active" : ""}`}
          onClick={() => setActiveTab("closed")}
        >
          🔒 已截止
          <span className="tab-count">{closedPolls.length}</span>
        </button>
      </div>

      {error && (
        <div className="error-message">
          <span>{error}</span>
          <button onClick={fetchPolls}>重试</button>
        </div>
      )}

      {!loading && displayPolls.length === 0 ? (
        <EmptyState
          icon="📭"
          title={
            activeTab === "active" ? "暂无进行中的投票" : "暂无已截止的投票"
          }
          description={
            activeTab === "active"
              ? "点击上方按钮创建第一个投票吧！"
              : "等待投票截止后会显示在这里"
          }
        />
      ) : (
        <div className="poll-list">
          {displayPolls.map((poll) => (
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
                <span
                  className={`badge ${isExpired(poll.deadline) ? "closed" : "active"}`}
                >
                  {isExpired(poll.deadline) ? "🔒 已结束" : "🟢 进行中"}
                </span>
                <span>
                  📋{" "}
                  {poll.poll_type === "single"
                    ? "单选"
                    : `多选(最多${poll.max_choices}项)`}
                </span>
                <span>👥 参与: {poll.total_voters}人</span>
                <span>📊 票数: {poll.total_votes}</span>
                <span>
                  ⏰ {isExpired(poll.deadline) ? "截止" : "截止"}:{" "}
                  {formatDate(poll.deadline)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Home;
