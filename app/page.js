'use client';

import { useState, useEffect } from 'react';
import { Users, BarChart3, FileText, Receipt, Upload, Loader2 } from 'lucide-react';

const modules = [
  { key: 'customer', label: 'Customer Intelligence', icon: Users, active: true },
  { key: 'data', label: 'Data Analyst', icon: BarChart3, active: false },
  { key: 'docs', label: 'Document Q&A', icon: FileText, active: false },
  { key: 'expense', label: 'Expense Extractor', icon: Receipt, active: false },
];

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

function riskColor(value) {
  if (value >= 60) return '#C9822E';
  if (value >= 30) return '#B58A3E';
  return '#2E6E62';
}

function RiskGauge({ value, size = 96 }) {
  const strokeWidth = Math.max(5, Math.round(size * 0.09));
  const pad = strokeWidth + 2;
  const radius = size / 2 - pad;
  const circumference = Math.PI * radius;
  const pct = Math.min(100, Math.max(0, value)) / 100;
  const offset = circumference * (1 - pct);
  const color = riskColor(value);
  const numSize = Math.round(size * 0.21);
  const labelSize = Math.max(8, Math.round(size * 0.095));
  const cy = size / 2;
  return (
    <svg width={size} height={size / 2 + labelSize + 14}>
      <path d={`M ${pad} ${cy} A ${radius} ${radius} 0 0 1 ${size - pad} ${cy}`} fill="none" stroke="#E3E1DA" strokeWidth={strokeWidth} strokeLinecap="round" />
      <path
        d={`M ${pad} ${cy} A ${radius} ${radius} 0 0 1 ${size - pad} ${cy}`}
        fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.5s ease' }}
      />
      <text x={size / 2} y={cy + 2} textAnchor="middle" className="gauge-number" fontSize={numSize}>{value}</text>
      <text x={size / 2} y={cy + 2 + labelSize + 2} textAnchor="middle" className="gauge-label" fontSize={labelSize}>RISK</text>
    </svg>
  );
}

export default function Home() {
  const [tab, setTab] = useState('churn');
  const [threshold, setThreshold] = useState(58.5);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sentimentStatus, setSentimentStatus] = useState(null);

  useEffect(() => {
    if (tab === 'sentiment' && !sentimentStatus) {
      fetch(`${API_URL}/api/sentiment/status`)
        .then((res) => res.json())
        .then(setSentimentStatus)
        .catch(() => setSentimentStatus({ status: 'unknown', message: 'Could not reach the API.' }));
    }
  }, [tab, sentimentStatus]);

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    setResults(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_URL}/api/churn/predict`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(detail.detail || `Request failed (${res.status})`);
      }
      const data = await res.json();
      setResults(data);
      setThreshold(data.threshold);
    } catch (err) {
      setError(err.message || 'Something went wrong uploading the file. Is the backend URL set correctly?');
    } finally {
      setLoading(false);
    }
  }

  const flaggedCount = results ? results.results.filter((c) => c.risk_score >= threshold).length : 0;
  const avgRisk = results
    ? Math.round(results.results.reduce((s, c) => s + c.risk_score, 0) / results.results.length)
    : 0;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="wordmark">Pulse<span>.</span></div>
        <nav style={{ display: 'flex', flexDirection: 'row', gap: 4, flexWrap: 'nowrap' }}>
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <div key={m.key} className={`nav-item ${m.active ? 'active' : 'disabled'}`}>
                <Icon size={16} />
                <span>{m.label}</span>
                {!m.active && <span className="nav-badge">SOON</span>}
              </div>
            );
          })}
        </nav>
      </aside>

      <main className="main">
        <div className="page-title">Customer Intelligence</div>
        <div className="page-sub">Churn risk and review sentiment, in one place.</div>

        <div className="segmented">
          <button className={`seg-btn ${tab === 'churn' ? 'active' : ''}`} onClick={() => setTab('churn')}>Churn Risk</button>
          <button className={`seg-btn ${tab === 'sentiment' ? 'active' : ''}`} onClick={() => setTab('sentiment')}>Sentiment Analysis</button>
        </div>

        {tab === 'churn' && (
          <>
            <div className="upload-box">
              <input
                type="file"
                accept=".csv"
                id="csv-upload"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <label htmlFor="csv-upload" style={{ cursor: 'pointer', display: 'block' }}>
                {loading
                  ? <Loader2 size={22} color="#8A8F98" className="spin" style={{ margin: '0 auto' }} />
                  : <Upload size={22} color="#8A8F98" style={{ margin: '0 auto' }} />}
                <div className="upload-title">{loading ? 'Analyzing…' : 'Click to upload a CSV of customer data'}</div>
                <div className="upload-sub">Expects the same columns used in training (contract, tenure, complaints, etc.)</div>
              </label>
            </div>

            {error && <div className="error-box">{error}</div>}
            {results?.data_completeness_warning && (
              <div className="warning-box">{results.data_completeness_warning}</div>
            )}

            {results && (
              <>
                <div className="card-row">
                  <div className="stat-card">
                    <div>
                      <div className="stat-value">{results.total_customers.toLocaleString()}</div>
                      <div className="stat-label">Customers analyzed</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div>
                      <div className="stat-value" style={{ color: '#C9822E' }}>{flaggedCount}</div>
                      <div className="stat-label">Flagged at current threshold</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <RiskGauge value={avgRisk} size={64} />
                    <div className="stat-label">Average risk score</div>
                  </div>
                </div>

                <div className="threshold-panel">
                  <div className="threshold-head">
                    <span className="threshold-title">Flagging threshold</span>
                    <span className="threshold-value">{threshold.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="0.5"
                    value={threshold}
                    onChange={(e) => setThreshold(parseFloat(e.target.value))}
                    className="threshold-slider"
                  />
                  <div className="threshold-note">
                    Lower the threshold to flag more at-risk customers. Raise it to focus outreach on the highest-confidence cases.
                  </div>
                </div>

                <table className="risk-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Risk</th>
                      <th>Status</th>
                      <th>Why flagged</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.results
                      .slice()
                      .sort((a, b) => b.risk_score - a.risk_score)
                      .map((c) => (
                        <tr key={c.customer_id}>
                          <td className="id-cell">{c.customer_id}</td>
                          <td><span className="risk-num" style={{ color: riskColor(c.risk_score) }}>{c.risk_score}</span></td>
                          <td>
                            <span className={`status-pill ${c.risk_score >= threshold ? 'status-flagged' : 'status-clear'}`}>
                              {c.risk_score >= threshold ? 'Flagged' : 'Clear'}
                            </span>
                          </td>
                          <td style={{ color: '#6B7280' }}>{c.reason}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </>
            )}
          </>
        )}

        {tab === 'sentiment' && (
          <div className="coming-soon-card">
            <div className="coming-soon-title">Sentiment Analysis — Coming Soon</div>
            <div className="coming-soon-text">
              {sentimentStatus ? sentimentStatus.message : 'Checking status…'}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
