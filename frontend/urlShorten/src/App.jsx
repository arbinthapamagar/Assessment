import { useState, useEffect } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Tooltip,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import './App.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip);

const API = '/api';

function App() {
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

    // load the url list when page opens
    useEffect(() => {
        fetchUrls();
    }, []);

    // countdown ticker, runs again every time countdown changes
    useEffect(() => {
        if (countdown <= 0) return;
        const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        return () => clearTimeout(timer);
    }, [countdown]);

    const fetchUrls = async () => {
        try {
            const res = await fetch(`${API}/urls`);
            const data = await res.json();
            if (data.success) {
                setUrls(data.data);
            }
        } catch (err) {
            console.error('couldnt load urls', err);
        }
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

            // rate limited, start the countdown so user knows when to retry
            if (res.status === 429) {
                setCountdown(data.retryAfter || 60);
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
        try {
            const res = await fetch(`${API}/analytics/${alias}`);
            const data = await res.json();
            if (data.success) {
                setAnalytics(data.data);
            }
        } catch (err) {
            console.error('analytics fetch failed', err);
        } finally {
            setAnalyticsLoading(false);
        }
    };

    // build chart data only when we actually have analytics
    let chartData = null;
    if (analytics) {
        chartData = {
            labels: analytics.dailyClicks.map((d) => d.date.slice(5)),
            datasets: [
                {
                    label: 'Clicks',
                    data: analytics.dailyClicks.map((d) => d.count),
                    borderColor: '#ff6b1a',
                    backgroundColor: '#ff6b1a',
                    tension: 0.3,
                },
            ],
        };
    }

    const chartOptions = {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
            y: {
                beginAtZero: true,
                ticks: { stepSize: 1, color: '#888' },
                grid: { color: '#222' },
            },
            x: {
                ticks: { color: '#888' },
                grid: { display: false },
            },
        },
    };

    return (
        <div className="app">
            <header className="header">
                <h1>URL<span className="accent">Short</span></h1>
                <p>shorten links, track clicks</p>
            </header>

            <section className="card">
                <h2>Shorten a URL</h2>

                <form onSubmit={handleShorten} className="shorten-form">
                    <input
                        type="text"
                        value={inputUrl}
                        onChange={(e) => setInputUrl(e.target.value)}
                        placeholder="https://example.com/some/long/link"
                        disabled={countdown > 0 || loading}
                    />
                    <button type="submit" disabled={loading || countdown > 0 || !inputUrl.trim()}>
                        {loading ? '...' : 'Shorten'}
                    </button>
                </form>

                {countdown > 0 && (
                    <div className="notice notice-warn">
                        Rate limit hit. Try again in <strong>{countdown}s</strong>
                    </div>
                )}

                {error && countdown === 0 && (
                    <div className="notice notice-error">{error}</div>
                )}

                {result && (
                    <div className="result">
                        <a href={result.shortUrl} target="_blank" rel="noreferrer">
                            {result.shortUrl}
                        </a>
                        <button onClick={() => copyLink(result.shortUrl)}>
                            {copied ? 'copied!' : 'copy'}
                        </button>
                    </div>
                )}
            </section>

            <section className="card">
                <div className="section-top">
                    <h2>Analytics</h2>
                    <button className="btn-outline" onClick={fetchUrls}>
                        Refresh
                    </button>
                </div>

                {urls.length === 0 ? (
                    <p className="muted">nothing here yet, shorten a url first</p>
                ) : (
                    <div className="dash">
                        <ul className="url-list">
                            {urls.map((u) => (
                                <li
                                    key={u.alias}
                                    className={selectedAlias === u.alias ? 'active' : ''}
                                    onClick={() => loadAnalytics(u.alias)}
                                >
                                    <span className="alias">/{u.alias}</span>
                                    <span className="clicks">{u.totalClicks} clicks</span>
                                    <span className="orig">{u.originalUrl}</span>
                                </li>
                            ))}
                        </ul>

                        <div className="chart-area">
                            {!selectedAlias && <p className="muted">pick a url to see the chart</p>}
                            {analyticsLoading && <p className="muted">loading...</p>}

                            {!analyticsLoading && analytics && selectedAlias && (
                                <>
                                    <div className="chart-top">
                                        <span className="alias">/{analytics.alias}</span>
                                        <span className="muted">{analytics.totalClicks} total</span>
                                        <button
                                            className="btn-outline"
                                            onClick={() => loadAnalytics(selectedAlias)}
                                        >
                                            Refresh
                                        </button>
                                    </div>
                                    <Line data={chartData} options={chartOptions} />
                                </>
                            )}
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}

export default App;
