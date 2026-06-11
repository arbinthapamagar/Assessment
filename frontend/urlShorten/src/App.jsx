import { useState, useEffect, useRef } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Tooltip,
    Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import './App.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

const API = '/api';

export default function App() {
    const [inputUrl, setInputUrl] = useState('');
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [countdown, setCountdown] = useState(0);

    const [urls, setUrls] = useState([]);
    const [selectedAlias, setSelectedAlias] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const timerRef = useRef(null);

    useEffect(() => {
        fetchUrls();
    }, []);

    // cleanup countdown timer on unmount
    useEffect(() => {
        return () => clearInterval(timerRef.current);
    }, []);

    const fetchUrls = async () => {
        try {
            const res = await fetch(`${API}/urls`);
            const data = await res.json();
            if (data.success) setUrls(data.data);
        } catch (err) {
            console.error('Failed to load URLs:', err);
        }
    };

    const startCountdown = (seconds) => {
        setCountdown(seconds);
        clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const handleShorten = async (e) => {
        e.preventDefault();
        if (!inputUrl.trim() || countdown > 0) return;

        setLoading(true);
        setError('');
        setResult(null);

        try {
            const res = await fetch(`${API}/shorten`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: inputUrl.trim() }),
            });

            const data = await res.json();

            if (res.status === 429) {
                startCountdown(data.retryAfter || 60);
                setError(data.message);
                return;
            }

            if (!res.ok) {
                setError(data.message || 'Something went wrong');
                return;
            }

            setResult(data.data);
            setInputUrl('');
            fetchUrls();
        } catch {
            setError('Network error. Is the server running?');
        } finally {
            setLoading(false);
        }
    };

    const copyLink = (text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const loadAnalytics = async (alias) => {
        setSelectedAlias(alias);
        setAnalyticsLoading(true);
        setAnalytics(null);
        try {
            const res = await fetch(`${API}/analytics/${alias}`);
            const data = await res.json();
            if (data.success) setAnalytics(data.data);
        } catch (err) {
            console.error('Analytics fetch failed:', err);
        } finally {
            setAnalyticsLoading(false);
        }
    };

    const chartData = analytics
        ? {
              labels: analytics.dailyClicks.map((d) => d.date.slice(5)), // MM-DD is enough
              datasets: [
                  {
                      label: 'Clicks',
                      data: analytics.dailyClicks.map((d) => d.count),
                      borderColor: '#2563eb',
                      backgroundColor: 'rgba(37, 99, 235, 0.07)',
                      tension: 0.35,
                      fill: true,
                      pointRadius: 4,
                      pointHoverRadius: 6,
                  },
              ],
          }
        : null;

    const chartOptions = {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
            y: {
                beginAtZero: true,
                ticks: { stepSize: 1, precision: 0 },
                grid: { color: '#f0f0f0' },
            },
            x: { grid: { display: false } },
        },
    };

    return (
        <div className="app">
            <header className="header">
                <h1>URL Shortener</h1>
                <p>Shorten links and track clicks over time.</p>
            </header>

            <main className="main">
                {/* ── shorten section ── */}
                <section className="card">
                    <h2>Shorten a URL</h2>

                    <form onSubmit={handleShorten} className="shorten-form">
                        <input
                            type="text"
                            value={inputUrl}
                            onChange={(e) => setInputUrl(e.target.value)}
                            placeholder="https://example.com/very/long/link"
                            disabled={countdown > 0 || loading}
                        />
                        <button
                            type="submit"
                            disabled={loading || countdown > 0 || !inputUrl.trim()}
                        >
                            {loading ? 'Working…' : 'Shorten'}
                        </button>
                    </form>

                    {/* rate limit countdown */}
                    {countdown > 0 && (
                        <div className="notice notice--warn">
                            Rate limit reached. Try again in{' '}
                            <strong>{countdown}s</strong>
                        </div>
                    )}

                    {error && countdown === 0 && (
                        <div className="notice notice--error">{error}</div>
                    )}

                    {result && (
                        <div className="result">
                            <a
                                href={result.shortUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="result-link"
                            >
                                {result.shortUrl}
                            </a>
                            <button
                                className="btn-copy"
                                onClick={() => copyLink(result.shortUrl)}
                            >
                                {copied ? 'Copied!' : 'Copy'}
                            </button>
                        </div>
                    )}
                </section>

                {/* ── analytics section ── */}
                <section className="card">
                    <div className="section-header">
                        <h2>Analytics</h2>
                        <button className="btn-ghost" onClick={fetchUrls}>
                            Refresh list
                        </button>
                    </div>

                    {urls.length === 0 ? (
                        <p className="muted">No URLs yet. Shorten something above.</p>
                    ) : (
                        <div className="analytics-layout">
                            {/* URL list */}
                            <ul className="url-list">
                                {urls.map((u) => (
                                    <li
                                        key={u.alias}
                                        className={`url-item ${selectedAlias === u.alias ? 'url-item--active' : ''}`}
                                        onClick={() => loadAnalytics(u.alias)}
                                    >
                                        <span className="url-alias">/{u.alias}</span>
                                        <span className="url-clicks">
                                            {u.totalClicks} click{u.totalClicks !== 1 ? 's' : ''}
                                        </span>
                                        <span className="url-original">{u.originalUrl}</span>
                                    </li>
                                ))}
                            </ul>

                            {/* chart pane */}
                            <div className="chart-pane">
                                {!selectedAlias && (
                                    <p className="muted">Select a URL to see its click data.</p>
                                )}

                                {analyticsLoading && (
                                    <p className="muted">Loading…</p>
                                )}

                                {!analyticsLoading && analytics && (
                                    <>
                                        <div className="chart-meta">
                                            <span className="chart-alias">
                                                /{analytics.alias}
                                            </span>
                                            <span className="muted">
                                                {analytics.totalClicks} total clicks
                                            </span>
                                            <button
                                                className="btn-ghost"
                                                onClick={() => loadAnalytics(selectedAlias)}
                                            >
                                                Refresh chart
                                            </button>
                                        </div>
                                        <Line data={chartData} options={chartOptions} />
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
