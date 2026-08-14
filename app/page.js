'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, BarChart3, FileText, Receipt, Upload, Loader2, LogOut, Send } from 'lucide-react';
import { useAuth } from '../lib/useAuth';

const modules = [
  { key: 'customer', label: 'Customer Intelligence', icon: Users, active: true },
  { key: 'data', label: 'Data Analyst', icon: BarChart3, active: true },
  { key: 'docs', label: 'Document Q&A', icon: FileText, active: false },
  { key: 'expense', label: 'Expense Extractor', icon: Receipt, active: true },
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
  const router = useRouter();
  const { user, session, loading: authLoading, signOut } = useAuth();

  const [view, setView] = useState('customer');
  const [tab, setTab] = useState('churn');

  // Churn state
  const [threshold, setThreshold] = useState(58.5);
  const [churnResults, setChurnResults] = useState(null);
  const [churnLoading, setChurnLoading] = useState(false);
  const [churnError, setChurnError] = useState(null);

  // Data Analyst state
  const [daResults, setDaResults] = useState(null);
  const [daLoading, setDaLoading] = useState(false);
  const [daError, setDaError] = useState(null);
  const [daFile, setDaFile] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [targetColumn, setTargetColumn] = useState('');
  const [predictResults, setPredictResults] = useState(null);
  const [predictLoading, setPredictLoading] = useState(false);
  const [predictError, setPredictError] = useState(null);

  // Expense Extractor state
  const [expenseParsed, setExpenseParsed] = useState(null);
  const [expenseLoading, setExpenseLoading] = useState(false);
  const [expenseError, setExpenseError] = useState(null);
  const [expenseSaving, setExpenseSaving] = useState(false);
  const [savedExpenses, setSavedExpenses] = useState([]);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  function authHeaders() {
    return { Authorization: `Bearer ${session?.access_token}` };
  }

  async function handleChurnUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setChurnLoading(true);
    setChurnError(null);
    setChurnResults(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_URL}/api/churn/predict`, {
        method: 'POST', headers: authHeaders(), body: formData,
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(detail.detail || `Request failed (${res.status})`);
      }
      const data = await res.json();
      setChurnResults(data);
      setThreshold(data.threshold);
    } catch (err) {
      setChurnError(err.message || 'Something went wrong uploading the file.');
    } finally {
      setChurnLoading(false);
    }
  }

  async function handleDataUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setDaLoading(true);
    setDaError(null);
    setDaResults(null);
    setChatMessages([]);
    setPredictResults(null);
    setPredictError(null);
    setTargetColumn('');
    setDaFile(file);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_URL}/api/data-analyst/analyze`, {
        method: 'POST', headers: authHeaders(), body: formData,
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(detail.detail || `Request failed (${res.status})`);
      }
      const data = await res.json();
      setDaResults(data);
    } catch (err) {
      setDaError(err.message || 'Something went wrong analyzing the file.');
    } finally {
      setDaLoading(false);
    }
  }

  async function handlePredict() {
    if (!targetColumn || !daFile) return;
    setPredictLoading(true);
    setPredictError(null);
    setPredictResults(null);

    const formData = new FormData();
    formData.append('file', daFile);
    formData.append('target_column', targetColumn);

    try {
      const res = await fetch(`${API_URL}/api/data-analyst/predict`, {
        method: 'POST', headers: authHeaders(), body: formData,
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(detail.detail || `Request failed (${res.status})`);
      }
      setPredictResults(await res.json());
    } catch (err) {
      setPredictError(err.message || 'Something went wrong training the model.');
    } finally {
      setPredictLoading(false);
    }
  }

  async function handleReceiptUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setExpenseLoading(true);
    setExpenseError(null);
    setExpenseParsed(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_URL}/api/expenses/parse`, {
        method: 'POST', headers: authHeaders(), body: formData,
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(detail.detail || `Request failed (${res.status})`);
      }
      setExpenseParsed(await res.json());
    } catch (err) {
      setExpenseError(err.message || 'Something went wrong reading the receipt.');
    } finally {
      setExpenseLoading(false);
    }
  }

  async function handleSaveExpense() {
    if (!expenseParsed) return;
    setExpenseSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/expenses`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseParsed),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(detail.detail || `Request failed (${res.status})`);
      }
      const data = await res.json();
      setSavedExpenses((list) => [data.record, ...list]);
      setExpenseParsed(null);
    } catch (err) {
      setExpenseError(err.message || 'Something went wrong saving this expense.');
    } finally {
      setExpenseSaving(false);
    }
  }

  async function handleChatSend() {
    if (!chatInput.trim() || !daResults?.analysis_id) return;
    const question = chatInput.trim();
    setChatMessages((m) => [...m, { role: 'user', content: question }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/data-analyst/chat`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis_id: daResults.analysis_id, question }),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(detail.detail || `Request failed (${res.status})`);
      }
      const data = await res.json();
      setChatMessages((m) => [...m, { role: 'assistant', content: data.answer }]);
    } catch (err) {
      setChatMessages((m) => [...m, { role: 'assistant', content: `Error: ${err.message}` }]);
    } finally {
      setChatLoading(false);
    }
  }

  if (authLoading || !user) {
    return <div className="app-shell"><div className="main"><div className="page-sub">Loading…</div></div></div>;
  }

  const flaggedCount = churnResults ? churnResults.results.filter((c) => c.risk_score >= threshold).length : 0;
  const avgRisk = churnResults
    ? Math.round(churnResults.results.reduce((s, c) => s + c.risk_score, 0) / churnResults.results.length)
    : 0;
  const maxRevenue = daResults?.forecast
    ? Math.max(...daResults.forecast.history.map((d) => d.value), ...daResults.forecast.forecast.map((d) => d.value))
    : 0;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="wordmark">Pulse<span>.</span></div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <button key={m.key} className={`nav-item ${view === m.key ? 'active' : ''}`} onClick={() => m.active && setView(m.key)} disabled={!m.active}>
                <Icon size={16} />
                <span>{m.label}</span>
                {!m.active && <span className="nav-badge">SOON</span>}
              </button>
            );
          })}
        </nav>
        <button className="logout-btn" onClick={() => signOut()}>
          <LogOut size={14} /> Sign out
        </button>
      </aside>

      <main className="main">
        {view === 'customer' && (
          <>
            <div className="page-title">Customer Intelligence</div>
            <div className="page-sub">Churn risk and review sentiment, in one place.</div>

            <div className="segmented">
              <button className={`seg-btn ${tab === 'churn' ? 'active' : ''}`} onClick={() => setTab('churn')}>Churn Risk</button>
              <button className={`seg-btn ${tab === 'sentiment' ? 'active' : ''}`} onClick={() => setTab('sentiment')}>Sentiment Analysis</button>
            </div>

            {tab === 'churn' && (
              <>
                <div className="upload-box">
                  <input type="file" accept=".csv" id="csv-upload" onChange={handleChurnUpload} style={{ display: 'none' }} />
                  <label htmlFor="csv-upload" style={{ cursor: 'pointer', display: 'block' }}>
                    {churnLoading
                      ? <Loader2 size={22} color="#8A8F98" className="spin" style={{ margin: '0 auto' }} />
                      : <Upload size={22} color="#8A8F98" style={{ margin: '0 auto' }} />}
                    <div className="upload-title">{churnLoading ? 'Analyzing…' : 'Click to upload a CSV of customer data'}</div>
                    <div className="upload-sub">Expects the same columns used in training (contract, tenure, complaints, etc.)</div>
                  </label>
                </div>

                {churnError && <div className="error-box">{churnError}</div>}
                {churnResults?.data_completeness_warning && <div className="warning-box">{churnResults.data_completeness_warning}</div>}

                {churnResults && (
                  <>
                    <div className="card-row">
                      <div className="stat-card"><div><div className="stat-value">{churnResults.total_customers.toLocaleString()}</div><div className="stat-label">Customers analyzed</div></div></div>
                      <div className="stat-card"><div><div className="stat-value" style={{ color: '#C9822E' }}>{flaggedCount}</div><div className="stat-label">Flagged at current threshold</div></div></div>
                      <div className="stat-card"><RiskGauge value={avgRisk} size={64} /><div className="stat-label">Average risk score</div></div>
                    </div>

                    <div className="threshold-panel">
                      <div className="threshold-head"><span className="threshold-title">Flagging threshold</span><span className="threshold-value">{threshold.toFixed(1)}</span></div>
                      <input type="range" min="0" max="100" step="0.5" value={threshold} onChange={(e) => setThreshold(parseFloat(e.target.value))} className="threshold-slider" />
                      <div className="threshold-note">Lower the threshold to flag more at-risk customers. Raise it to focus outreach on the highest-confidence cases.</div>
                    </div>

                    <table className="risk-table">
                      <thead><tr><th>Customer</th><th>Risk</th><th>Status</th><th>Why flagged</th></tr></thead>
                      <tbody>
                        {churnResults.results.slice().sort((a, b) => b.risk_score - a.risk_score).map((c) => (
                          <tr key={c.customer_id}>
                            <td className="id-cell">{c.customer_id}</td>
                            <td><span className="risk-num" style={{ color: riskColor(c.risk_score) }}>{c.risk_score}</span></td>
                            <td><span className={`status-pill ${c.risk_score >= threshold ? 'status-flagged' : 'status-clear'}`}>{c.risk_score >= threshold ? 'Flagged' : 'Clear'}</span></td>
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
                <div className="coming-soon-text">Trained and validated at 86% accuracy — deploying once a paid Render tier is in place.</div>
              </div>
            )}
          </>
        )}

        {view === 'data' && (
          <>
            <div className="page-title">Data Analyst</div>
            <div className="page-sub">Upload any business data — get instant analysis and a chat interface to ask it questions.</div>

            <div className="upload-box">
              <input type="file" accept=".csv" id="data-upload" onChange={handleDataUpload} style={{ display: 'none' }} />
              <label htmlFor="data-upload" style={{ cursor: 'pointer', display: 'block' }}>
                {daLoading
                  ? <Loader2 size={22} color="#8A8F98" className="spin" style={{ margin: '0 auto' }} />
                  : <Upload size={22} color="#8A8F98" style={{ margin: '0 auto' }} />}
                <div className="upload-title">{daLoading ? 'Analyzing…' : 'Click to upload a CSV or Excel export'}</div>
                <div className="upload-sub">Sales, ops, whatever spreadsheet you've got</div>
              </label>
            </div>

            {daError && <div className="error-box">{daError}</div>}

            {daResults && (
              <>
                <div className="card-row">
                  <div className="stat-card"><div><div className="stat-value">{daResults.summary.row_count.toLocaleString()}</div><div className="stat-label">Rows detected</div></div></div>
                  <div className="stat-card"><div><div className="stat-value">{daResults.summary.column_count}</div><div className="stat-label">Columns detected</div></div></div>
                  <div className="stat-card"><div><div className="stat-value" style={{ color: daResults.summary.data_quality_score >= 80 ? '#2E6E62' : '#C9822E' }}>{daResults.summary.data_quality_score}%</div><div className="stat-label">Data quality score</div></div></div>
                </div>

                {daResults.forecast && (
                  <div className="chart-card">
                    <span className="threshold-title">{daResults.forecast.value_column} trend + 3-period forecast</span>
                    <div className="bar-chart">
                      {daResults.forecast.history.map((d) => (
                        <div className="bar-col" key={d.date}>
                          <div className="bar" style={{ height: `${(d.value / maxRevenue) * 100}%`, background: '#2E6E62' }} />
                          <span className="bar-label">{d.date.slice(5, 7)}</span>
                        </div>
                      ))}
                      {daResults.forecast.forecast.map((d) => (
                        <div className="bar-col" key={d.date}>
                          <div className="bar" style={{ height: `${(d.value / maxRevenue) * 100}%`, background: '#C9822E' }} />
                          <span className="bar-label">{d.date.slice(5, 7)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {daResults.summary.correlations?.length > 0 && (
                  <div className="chart-card">
                    <span className="threshold-title">Strongest correlations</span>
                    <table className="risk-table" style={{ marginTop: 12 }}>
                      <thead><tr><th>Column A</th><th>Column B</th><th>Correlation</th></tr></thead>
                      <tbody>
                        {daResults.summary.correlations.map((c, i) => (
                          <tr key={i}>
                            <td>{c.column_a}</td>
                            <td>{c.column_b}</td>
                            <td className="risk-num" style={{ color: Math.abs(c.correlation) >= 0.5 ? '#C9822E' : '#565D6B' }}>{c.correlation}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {daResults.summary.category_breakdowns?.map((b) => (
                  <div className="chart-card" key={b.category_column}>
                    <span className="threshold-title">Breakdown by {b.category_column}</span>
                    <table className="risk-table" style={{ marginTop: 12 }}>
                      <thead>
                        <tr>
                          <th>{b.category_column}</th>
                          <th>Count</th>
                          {Object.keys(b.groups[0] || {}).filter((k) => k !== 'group' && k !== 'count').map((k) => <th key={k}>{k}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {b.groups.map((g, i) => (
                          <tr key={i}>
                            <td>{g.group}</td>
                            <td className="id-cell">{g.count}</td>
                            {Object.keys(g).filter((k) => k !== 'group' && k !== 'count').map((k) => <td key={k}>{g[k]}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}

                <div className="chart-card">
                  <span className="threshold-title">Predict a column</span>
                  <div className="threshold-note" style={{ marginTop: 4 }}>Pick a column to train a quick model against — uses the rest of the data to predict it.</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <select className="chat-input" value={targetColumn} onChange={(e) => setTargetColumn(e.target.value)} style={{ flex: 1 }}>
                      <option value="">Choose a column…</option>
                      {daResults.summary.columns.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                    </select>
                    <button className="auth-submit" style={{ marginTop: 0, padding: '9px 16px' }} onClick={handlePredict} disabled={!targetColumn || predictLoading}>
                      {predictLoading ? 'Training…' : 'Train'}
                    </button>
                  </div>

                  {predictError && <div className="error-box" style={{ marginTop: 12 }}>{predictError}</div>}

                  {predictResults && (
                    <div style={{ marginTop: 16 }}>
                      <div className="card-row" style={{ marginTop: 0 }}>
                        <div className="stat-card"><div><div className="stat-value" style={{ fontSize: 16 }}>{predictResults.task_type}</div><div className="stat-label">Task type</div></div></div>
                        <div className="stat-card"><div><div className="stat-value">{predictResults.primary_metric.value}{predictResults.task_type === 'classification' ? '%' : ''}</div><div className="stat-label">{predictResults.primary_metric.name}</div></div></div>
                        <div className="stat-card"><div><div className="stat-value">{predictResults.secondary_metric.value}</div><div className="stat-label">{predictResults.secondary_metric.name}</div></div></div>
                      </div>
                      {predictResults.top_features.length > 0 && (
                        <>
                          <div className="threshold-title" style={{ marginTop: 16, display: 'block' }}>Most influential columns</div>
                          <div className="spectrum-legend" style={{ marginTop: 10, flexDirection: 'column', gap: 8 }}>
                            {predictResults.top_features.map((f) => (
                              <span key={f.feature}>{f.feature} — <span className="risk-num">{f.importance}</span></span>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="chat-card">
                  <span className="threshold-title">Ask your data</span>
                  <div className="chat-thread" style={{ marginTop: 12 }}>
                    {chatMessages.map((m, i) => (
                      <div key={i} className={`chat-bubble ${m.role === 'user' ? 'chat-user' : 'chat-assistant'}`}>{m.content}</div>
                    ))}
                    {chatLoading && <div className="chat-bubble chat-assistant">Thinking…</div>}
                  </div>
                  <div className="chat-input-row">
                    <input
                      className="chat-input" value={chatInput} placeholder="Ask a question about this dataset…"
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleChatSend()}
                    />
                    <button className="chat-send" onClick={handleChatSend}><Send size={15} /></button>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {view === 'expense' && (
          <>
            <div className="page-title">Expense Extractor</div>
            <div className="page-sub">Upload a receipt or invoice photo — Gemini reads it directly, no manual entry.</div>

            <div className="upload-box">
              <input type="file" accept="image/jpeg,image/png,image/webp" id="receipt-upload" onChange={handleReceiptUpload} style={{ display: 'none' }} />
              <label htmlFor="receipt-upload" style={{ cursor: 'pointer', display: 'block' }}>
                {expenseLoading
                  ? <Loader2 size={22} color="#8A8F98" className="spin" style={{ margin: '0 auto' }} />
                  : <Upload size={22} color="#8A8F98" style={{ margin: '0 auto' }} />}
                <div className="upload-title">{expenseLoading ? 'Reading receipt…' : 'Click to upload a receipt photo'}</div>
                <div className="upload-sub">JPG, PNG, or WEBP — vendor, date, amount, and category are extracted automatically</div>
              </label>
            </div>

            {expenseError && <div className="error-box">{expenseError}</div>}

            {expenseParsed && (
              <div className="chart-card">
                <span className="threshold-title">Review before saving</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
                  <input className="auth-input" placeholder="Vendor" value={expenseParsed.vendor || ''} onChange={(e) => setExpenseParsed({ ...expenseParsed, vendor: e.target.value })} />
                  <input className="auth-input" type="date" value={expenseParsed.date || ''} onChange={(e) => setExpenseParsed({ ...expenseParsed, date: e.target.value })} />
                  <input className="auth-input" type="number" step="0.01" placeholder="Amount" value={expenseParsed.amount ?? ''} onChange={(e) => setExpenseParsed({ ...expenseParsed, amount: parseFloat(e.target.value) })} />
                  <select className="auth-input" value={expenseParsed.category || ''} onChange={(e) => setExpenseParsed({ ...expenseParsed, category: e.target.value })}>
                    {['Software', 'Travel', 'Office Supplies', 'Meals', 'Utilities', 'Marketing', 'Professional Services', 'Other'].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <button className="auth-submit" onClick={handleSaveExpense} disabled={expenseSaving}>
                    {expenseSaving ? 'Saving…' : 'Save expense'}
                  </button>
                </div>
              </div>
            )}

            {savedExpenses.length > 0 && (
              <table className="risk-table">
                <thead><tr><th>Vendor</th><th>Date</th><th>Amount</th><th>Category</th></tr></thead>
                <tbody>
                  {savedExpenses.map((r) => (
                    <tr key={r.id}>
                      <td>{r.vendor}</td>
                      <td className="id-cell">{r.expense_date}</td>
                      <td className="risk-num">{r.currency} {r.amount}</td>
                      <td style={{ color: '#6B7280' }}>{r.category}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </main>
    </div>
  );
}
