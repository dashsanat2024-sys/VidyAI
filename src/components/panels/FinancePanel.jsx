/**
 * FinancePanel.jsx — Arthavi Internal Finance Ledger
 * Admin-only: track every rupee in/out — API costs, salaries, investments, subscriptions, etc.
 *
 * Tabs: Overview | Ledger | Payroll | Investments | Analytics
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { API_BASE } from '../../utils/api'

// ── helpers ──────────────────────────────────────────────────────────────────
async function apiFetch(url, token, method = 'GET', body = null) {
  const fullUrl = API_BASE + url.replace(/^\/api/, '')
  const res = await fetch(fullUrl, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

const fmt = (n, currency = '₹') =>
  n == null ? '—' : currency + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const fmtK = (n) => {
  if (n == null) return '—'
  const abs = Math.abs(n)
  if (abs >= 1_00_000) return '₹' + (n / 1_00_000).toFixed(1) + 'L'
  if (abs >= 1_000)   return '₹' + (n / 1_000).toFixed(1) + 'K'
  return '₹' + n.toFixed(0)
}

const today = () => new Date().toISOString().slice(0, 10)
const txnId = () => 'txn_' + Math.random().toString(36).slice(2, 10)

// ── Categories ──────────────────────────────────────────────────────────────
const EXPENSE_CATS = [
  { id: 'api_cost',    label: '🤖 AI / API Costs',        color: '#7c3aed' },
  { id: 'software',    label: '💻 Software & SaaS',        color: '#0284c7' },
  { id: 'cloud',       label: '☁️ Cloud & Hosting',         color: '#0891b2' },
  { id: 'salary',      label: '👨‍💼 Salaries & Payroll',     color: '#059669' },
  { id: 'marketing',   label: '📈 Marketing & Ads',         color: '#d97706' },
  { id: 'office',      label: '🏢 Office & Utilities',      color: '#64748b' },
  { id: 'legal',       label: '📋 Legal & Compliance',      color: '#dc2626' },
  { id: 'banking',     label: '🏦 Banking & Finance Fees',  color: '#0f172a' },
  { id: 'equipment',   label: '🔧 Tools & Equipment',       color: '#92400e' },
  { id: 'education',   label: '📚 Education & Training',    color: '#4f46e5' },
  { id: 'misc_exp',    label: '🛒 Miscellaneous Expense',   color: '#6b7280' },
]
const INCOME_CATS = [
  { id: 'subscription', label: '📱 Subscription Revenue',   color: '#059669' },
  { id: 'institution',  label: '🏫 Institution License',    color: '#0284c7' },
  { id: 'one_time',     label: '💳 One-time Payment',       color: '#d97706' },
  { id: 'investment',   label: '💰 Investment Received',    color: '#7c3aed' },
  { id: 'refund_recv',  label: '🔄 Refund Received',        color: '#64748b' },
  { id: 'other_income', label: '📦 Other Income',           color: '#0f172a' },
]
const ALL_CATS = [...EXPENSE_CATS, ...INCOME_CATS]

const TYPES = [
  { id: 'expense',    label: '💸 Expense',    color: '#dc2626', bg: '#fef2f2' },
  { id: 'income',     label: '💵 Income',     color: '#059669', bg: '#f0fdf4' },
  { id: 'salary',     label: '👤 Salary',     color: '#0284c7', bg: '#eff6ff' },
  { id: 'investment', label: '📊 Investment', color: '#7c3aed', bg: '#faf5ff' },
  { id: 'refund',     label: '🔄 Refund',     color: '#d97706', bg: '#fffbeb' },
  { id: 'transfer',   label: '↔️ Transfer',    color: '#64748b', bg: '#f8fafc' },
]

const catById  = (id) => ALL_CATS.find(c => c.id === id)  || { label: id, color: '#64748b' }
const typeById = (id) => TYPES.find(t => t.id === id) || { label: id, color: '#64748b', bg: '#f8fafc' }

const CURRENCY_OPTIONS = ['INR', 'USD', 'EUR', 'GBP', 'AED']

// ── Styles ───────────────────────────────────────────────────────────────────
const C = {
  indigo: '#4f46e5', indigoL: '#eef2ff', indigoB: '#c7d2fe',
  green:  '#059669', greenL:  '#f0fdf4', greenB:  '#86efac',
  red:    '#dc2626', redL:    '#fef2f2', redB:    '#fecaca',
  amber:  '#d97706', amberL:  '#fffbeb', amberB:  '#fde68a',
  blue:   '#0284c7', blueL:   '#eff6ff', blueB:   '#bae6fd',
  purple: '#7c3aed', purpleL: '#faf5ff', purpleB: '#e9d5ff',
  slate:  '#64748b', slateL:  '#f8fafc', slateB:  '#e2e8f0',
}

const card = (extra = {}) => ({
  background: '#fff', borderRadius: 12, padding: 18,
  border: `1px solid ${C.slateB}`, boxShadow: '0 1px 3px rgba(0,0,0,.06)', ...extra
})
const inp = (extra = {}) => ({
  padding: '8px 11px', border: `1.5px solid ${C.slateB}`, borderRadius: 8,
  fontSize: 13, fontFamily: 'inherit', outline: 'none', background: '#fff',
  color: '#0f172a', ...extra,
})
const btn = (bg, color, extra = {}) => ({
  padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
  fontWeight: 700, fontSize: 13, fontFamily: 'inherit',
  background: bg, color, ...extra,
})

// ═══════════════════════════════════════════════════════════════════════════════
//  SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 24, flexWrap: 'wrap', borderBottom: `2px solid ${C.slateB}`, paddingBottom: 0 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)}
          style={{ padding: '9px 18px', borderRadius: '8px 8px 0 0', fontWeight: 600, fontSize: 13,
            cursor: 'pointer', border: 'none', fontFamily: 'inherit', marginBottom: -2,
            background: active === t.id ? '#fff' : 'transparent',
            color:      active === t.id ? C.indigo : C.slate,
            borderBottom: active === t.id ? `2px solid ${C.indigo}` : '2px solid transparent',
            transition: 'all .15s' }}>
          {t.label}
        </button>
      ))}
    </div>
  )
}

function KPICard({ label, value, sub, icon, color, bg, border }) {
  return (
    <div style={{ background: bg || C.slateL, borderRadius: 12, padding: '16px 18px',
      border: `1.5px solid ${border || C.slateB}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        {sub && <span style={{ fontSize: 11, color: C.slate, fontWeight: 600 }}>{sub}</span>}
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: color || '#0f172a', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.slate, marginTop: 5,
        textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</div>
    </div>
  )
}

// ── Transaction Form (add/edit) ───────────────────────────────────────────────
function TxnForm({ initial, onSave, onCancel, loading }) {
  const [form, setForm] = useState(initial || {
    type: 'expense', category: 'api_cost', amount: '', currency: 'INR',
    description: '', vendor: '', date: today(), reference: '', notes: '',
    tags: '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const catsForType = form.type === 'income' || form.type === 'investment'
    ? INCOME_CATS
    : EXPENSE_CATS

  const handleTypeChange = (v) => {
    const defCat = v === 'income' ? 'subscription' : v === 'investment' ? 'investment' : v === 'salary' ? 'salary' : 'api_cost'
    set('type', v)
    set('category', defCat)
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {/* Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.slate,
            textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>Type *</label>
          <select value={form.type} onChange={e => handleTypeChange(e.target.value)} style={inp({ width: '100%' })}>
            {TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.slate,
            textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>Category *</label>
          <select value={form.category} onChange={e => set('category', e.target.value)} style={inp({ width: '100%' })}>
            {catsForType.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            {/* Allow selecting from full list for edge cases */}
            <option disabled>── Other ──</option>
            {ALL_CATS.filter(c => !catsForType.find(x => x.id === c.id))
              .map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.slate,
            textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>Date *</label>
          <input type="date" value={form.date} onChange={e => set('date', e.target.value)} style={inp({ width: '100%' })} />
        </div>
      </div>

      {/* Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.slate,
            textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>Description *</label>
          <input value={form.description} onChange={e => set('description', e.target.value)}
            placeholder="What is this for?" style={inp({ width: '100%' })} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.slate,
            textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>Vendor / Party</label>
          <input value={form.vendor} onChange={e => set('vendor', e.target.value)}
            placeholder="e.g. OpenAI, John Doe" style={inp({ width: '100%' })} />
        </div>
      </div>

      {/* Row 3 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.slate,
            textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>Amount *</label>
          <input type="number" min="0" step="0.01" value={form.amount}
            onChange={e => set('amount', e.target.value)}
            placeholder="0.00" style={inp({ width: '100%' })} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.slate,
            textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>Currency</label>
          <select value={form.currency} onChange={e => set('currency', e.target.value)} style={inp({ width: '100%' })}>
            {CURRENCY_OPTIONS.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.slate,
            textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>Ref / Invoice No.</label>
          <input value={form.reference} onChange={e => set('reference', e.target.value)}
            placeholder="INV-001" style={inp({ width: '100%' })} />
        </div>
      </div>

      {/* Row 4 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.slate,
            textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>Tags (comma-separated)</label>
          <input value={form.tags} onChange={e => set('tags', e.target.value)}
            placeholder="openai, production, monthly" style={inp({ width: '100%' })} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.slate,
            textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>Notes</label>
          <input value={form.notes} onChange={e => set('notes', e.target.value)}
            placeholder="Optional notes…" style={inp({ width: '100%' })} />
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
        <button onClick={onCancel} style={btn(C.slateL, C.slate)}>Cancel</button>
        <button
          disabled={loading || !form.description || !form.amount}
          onClick={() => onSave(form)}
          style={btn(
            loading || !form.description || !form.amount ? C.slateB : C.indigo,
            '#fff'
          )}>
          {loading ? '⏳ Saving…' : '💾 Save Transaction'}
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TAB: Overview
// ═══════════════════════════════════════════════════════════════════════════════
function OverviewTab({ summary, recentTxns, loading, onNavigate }) {
  if (loading) return <Loader />

  const s = summary || {}
  const totalIn  = s.total_income     || 0
  const totalOut = s.total_expenses   || 0
  const netPL    = totalIn - totalOut
  const apiCost  = s.api_cost_total   || 0
  const salaryCost = s.salary_total   || 0
  const invested = s.investment_total || 0

  return (
    <div>
      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))',
        gap: 12, marginBottom: 24 }}>
        <KPICard icon="💵" label="Total Income" value={fmtK(totalIn)}
          color={C.green} bg={C.greenL} border={C.greenB} sub="all time" />
        <KPICard icon="💸" label="Total Expenses" value={fmtK(totalOut)}
          color={C.red} bg={C.redL} border={C.redB} sub="all time" />
        <KPICard icon={netPL >= 0 ? '📈' : '📉'} label="Net P&L"
          value={fmtK(netPL)}
          color={netPL >= 0 ? C.green : C.red}
          bg={netPL >= 0 ? C.greenL : C.redL}
          border={netPL >= 0 ? C.greenB : C.redB} sub="income − expense" />
        <KPICard icon="🤖" label="AI / API Costs" value={fmtK(apiCost)}
          color={C.purple} bg={C.purpleL} border={C.purpleB} sub="all time" />
        <KPICard icon="👨‍💼" label="Payroll Paid" value={fmtK(salaryCost)}
          color={C.blue} bg={C.blueL} border={C.blueB} sub="all time" />
        <KPICard icon="💰" label="Investments In" value={fmtK(invested)}
          color={C.amber} bg={C.amberL} border={C.amberB} sub="all time" />
      </div>

      {/* Monthly summary bar chart */}
      {(s.monthly || []).length > 0 && (
        <div style={card({ marginBottom: 20 })}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 16 }}>
            📊 Monthly Income vs Expenses
          </div>
          <MonthlyBars data={s.monthly} />
        </div>
      )}

      {/* Category breakdown */}
      {(s.by_category || []).length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div style={card()}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', marginBottom: 12 }}>💸 Expense Breakdown</div>
            <CategoryBars data={s.by_category.filter(c => c.flow === 'expense')} total={totalOut} />
          </div>
          <div style={card()}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', marginBottom: 12 }}>💵 Income Breakdown</div>
            <CategoryBars data={s.by_category.filter(c => c.flow === 'income')} total={totalIn} color={C.green} />
          </div>
        </div>
      )}

      {/* Recent transactions */}
      <div style={card()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>🕐 Recent Transactions</div>
          <button onClick={() => onNavigate('ledger')} style={btn(C.indigoL, C.indigo, { fontSize: 12, padding: '5px 12px' })}>
            View All →
          </button>
        </div>
        {recentTxns.length === 0 ? (
          <div style={{ color: C.slate, fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
            No transactions recorded yet. Add your first one in the Ledger tab.
          </div>
        ) : (
          recentTxns.slice(0, 8).map(t => <TxnRow key={t.id} txn={t} compact />)
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TAB: Ledger (full CRUD)
// ═══════════════════════════════════════════════════════════════════════════════
function LedgerTab({ token, showToast, onRefresh }) {
  const [txns,      setTxns]      = useState([])
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [showForm,  setShowForm]  = useState(false)
  const [editTxn,   setEditTxn]   = useState(null)
  const [deleting,  setDeleting]  = useState(null)
  const [filters,   setFilters]   = useState({ type: '', category: '', search: '', from: '', to: '' })
  const [page,      setPage]      = useState(1)
  const PAGE_SIZE = 20

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.type)     params.set('type',     filters.type)
      if (filters.category) params.set('category', filters.category)
      if (filters.from)     params.set('from',     filters.from)
      if (filters.to)       params.set('to',       filters.to)
      if (filters.search)   params.set('q',        filters.search)
      const d = await apiFetch(`/api/admin/finance/transactions?${params}`, token)
      setTxns(d.transactions || [])
    } catch (e) { showToast(e.message, 'error') }
    setLoading(false)
  }, [token, filters, showToast])

  useEffect(() => { load() }, [load])

  const handleSave = async (form) => {
    setSaving(true)
    try {
      const payload = {
        ...form,
        amount: parseFloat(form.amount),
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      }
      if (editTxn) {
        await apiFetch(`/api/admin/finance/transactions/${editTxn.id}`, token, 'PATCH', payload)
        showToast('Transaction updated', 'success')
      } else {
        await apiFetch('/api/admin/finance/transactions', token, 'POST', payload)
        showToast('Transaction added', 'success')
      }
      setShowForm(false); setEditTxn(null)
      load(); onRefresh?.()
    } catch (e) { showToast(e.message, 'error') }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    setDeleting(id)
    try {
      await apiFetch(`/api/admin/finance/transactions/${id}`, token, 'DELETE')
      showToast('Transaction deleted', 'success')
      load(); onRefresh?.()
    } catch (e) { showToast(e.message, 'error') }
    setDeleting(null)
  }

  const filtered = txns  // server-side filtered
  const pageCount = Math.ceil(filtered.length / PAGE_SIZE)
  const paged     = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const totalShown = filtered.reduce((acc, t) => {
    const amount = t.amount || 0
    if (['expense', 'salary'].includes(t.type)) return { ...acc, out: acc.out + amount }
    if (['income', 'investment'].includes(t.type)) return { ...acc, in: acc.in + amount }
    return acc
  }, { in: 0, out: 0 })

  return (
    <div>
      {/* Filters */}
      <div style={card({ marginBottom: 16, padding: '14px 16px' })}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <input value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            placeholder="🔍 Search description, vendor…"
            style={inp({ flex: '1 1 200px', minWidth: 160 })} />
          <select value={filters.type}
            onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}>
            <option value="">All Types</option>
            {TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <select value={filters.category}
            onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}
            style={inp()}>
            <option value="">All Categories</option>
            {ALL_CATS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <input type="date" value={filters.from}
            onChange={e => setFilters(f => ({ ...f, from: e.target.value }))}
            style={inp()} title="From date" />
          <input type="date" value={filters.to}
            onChange={e => setFilters(f => ({ ...f, to: e.target.value }))}
            style={inp()} title="To date" />
          <button onClick={() => setFilters({ type: '', category: '', search: '', from: '', to: '' })}
            style={btn(C.slateL, C.slate, { fontSize: 12 })}>Clear</button>
          <button
            onClick={() => { setEditTxn(null); setShowForm(s => !s) }}
            style={btn(C.indigo, '#fff', { marginLeft: 'auto' })}>
            {showForm ? '✕ Cancel' : '＋ Add Transaction'}
          </button>
        </div>
      </div>

      {/* Quick totals */}
      {filtered.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <div style={{ padding: '7px 14px', borderRadius: 8, background: C.greenL,
            border: `1px solid ${C.greenB}`, fontSize: 13, fontWeight: 700, color: C.green }}>
            In: {fmt(totalShown.in)}
          </div>
          <div style={{ padding: '7px 14px', borderRadius: 8, background: C.redL,
            border: `1px solid ${C.redB}`, fontSize: 13, fontWeight: 700, color: C.red }}>
            Out: {fmt(totalShown.out)}
          </div>
          <div style={{ padding: '7px 14px', borderRadius: 8,
            background: totalShown.in - totalShown.out >= 0 ? C.greenL : C.redL,
            border: `1px solid ${totalShown.in - totalShown.out >= 0 ? C.greenB : C.redB}`,
            fontSize: 13, fontWeight: 700,
            color: totalShown.in - totalShown.out >= 0 ? C.green : C.red }}>
            Net: {fmt(totalShown.in - totalShown.out)}
          </div>
          <div style={{ marginLeft: 'auto', padding: '7px 14px', borderRadius: 8,
            background: C.slateL, border: `1px solid ${C.slateB}`,
            fontSize: 13, color: C.slate, fontWeight: 600 }}>
            {filtered.length} records
          </div>
        </div>
      )}

      {/* Add/Edit form */}
      {showForm && (
        <div style={card({ marginBottom: 16, border: `2px solid ${C.indigoB}` })}>
          <div style={{ fontWeight: 700, fontSize: 14, color: C.indigo, marginBottom: 16 }}>
            {editTxn ? '✏️ Edit Transaction' : '➕ New Transaction'}
          </div>
          <TxnForm
            initial={editTxn ? {
              ...editTxn,
              tags: (editTxn.tags || []).join(', ')
            } : undefined}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditTxn(null) }}
            loading={saving}
          />
        </div>
      )}

      {/* Table */}
      <div style={card({ padding: 0, overflow: 'hidden' })}>
        {loading ? <div style={{ padding: 32, textAlign: 'center' }}><Loader inline /></div> : (
          <>
            {paged.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', color: C.slate, fontSize: 13 }}>
                No transactions found. Add one using the button above.
              </div>
            ) : (
              <>
                <div style={{ display: 'grid',
                  gridTemplateColumns: '80px 1fr 120px 90px 100px 80px 90px',
                  padding: '10px 16px', background: C.slateL,
                  borderBottom: `1px solid ${C.slateB}`,
                  fontSize: 11, fontWeight: 700, color: C.slate,
                  textTransform: 'uppercase', letterSpacing: '.04em' }}>
                  <div>Date</div><div>Description</div><div>Category</div>
                  <div style={{ textAlign: 'right' }}>Type</div>
                  <div style={{ textAlign: 'right' }}>Amount</div>
                  <div>Ref</div><div style={{ textAlign: 'right' }}>Actions</div>
                </div>
                {paged.map(t => (
                  <LedgerRow key={t.id} txn={t}
                    onEdit={() => { setEditTxn(t); setShowForm(true) }}
                    onDelete={() => handleDelete(t.id)}
                    deleting={deleting === t.id} />
                ))}
              </>
            )}

            {/* Pagination */}
            {pageCount > 1 && (
              <div style={{ display: 'flex', gap: 6, justifyContent: 'center',
                padding: '12px 16px', borderTop: `1px solid ${C.slateB}` }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  style={btn(C.slateL, C.slate, { padding: '5px 12px', fontSize: 12 })}>← Prev</button>
                <span style={{ padding: '5px 12px', fontSize: 12, color: C.slate, fontWeight: 600 }}>
                  {page} / {pageCount}
                </span>
                <button onClick={() => setPage(p => Math.min(pageCount, p + 1))} disabled={page === pageCount}
                  style={btn(C.slateL, C.slate, { padding: '5px 12px', fontSize: 12 })}>Next →</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TAB: Payroll
// ═══════════════════════════════════════════════════════════════════════════════
function PayrollTab({ token, showToast, onRefresh }) {
  const [employees, setEmployees] = useState([])
  const [txns,      setTxns]      = useState([])
  const [loading,   setLoading]   = useState(true)
  const [showEmpForm, setShowEmpForm] = useState(false)
  const [saving,   setSaving]    = useState(false)
  const [emp, setEmp] = useState({ name: '', role: '', email: '', monthly_salary: '',
    currency: 'INR', type: 'employee', bank_ref: '', joined_on: today(), notes: '' })
  const [paying, setPaying] = useState(null)
  const [payMonth, setPayMonth] = useState(today().slice(0, 7))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [ed, td] = await Promise.all([
        apiFetch('/api/admin/finance/payroll/employees', token),
        apiFetch('/api/admin/finance/transactions?type=salary', token),
      ])
      setEmployees(ed.employees || [])
      setTxns(td.transactions || [])
    } catch {
      setEmployees([]); setTxns([])
    }
    setLoading(false)
  }, [token])

  useEffect(() => { load() }, [load])

  const saveEmployee = async () => {
    if (!emp.name || !emp.monthly_salary) return
    setSaving(true)
    try {
      await apiFetch('/api/admin/finance/payroll/employees', token, 'POST', {
        ...emp, monthly_salary: parseFloat(emp.monthly_salary)
      })
      showToast('Employee added', 'success')
      setShowEmpForm(false)
      setEmp({ name: '', role: '', email: '', monthly_salary: '', currency: 'INR',
        type: 'employee', bank_ref: '', joined_on: today(), notes: '' })
      load()
    } catch (e) { showToast(e.message, 'error') }
    setSaving(false)
  }

  const payNow = async (employee) => {
    setPaying(employee.id)
    try {
      await apiFetch('/api/admin/finance/transactions', token, 'POST', {
        type: 'salary', category: 'salary',
        amount: employee.monthly_salary,
        currency: employee.currency || 'INR',
        description: `Salary — ${employee.name} (${payMonth})`,
        vendor: employee.name,
        date: today(),
        reference: `PAYROLL-${payMonth}`,
        notes: `Monthly salary for ${payMonth}`,
        tags: ['payroll', employee.name.toLowerCase().replace(/\s+/g, '-')],
      })
      showToast(`Salary recorded for ${employee.name}`, 'success')
      load(); onRefresh?.()
    } catch (e) { showToast(e.message, 'error') }
    setPaying(null)
  }

  const totalMonthly = employees.reduce((a, e) => a + (e.monthly_salary || 0), 0)
  const paidThisMonth = txns.filter(t =>
    (t.reference || '').includes(payMonth) || t.date?.startsWith(payMonth)
  ).reduce((a, t) => a + (t.amount || 0), 0)

  if (loading) return <Loader />

  return (
    <div>
      {/* Summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))',
        gap: 12, marginBottom: 20 }}>
        <KPICard icon="👥" label="Team Size" value={employees.length}
          bg={C.blueL} border={C.blueB} color={C.blue} />
        <KPICard icon="💰" label="Monthly Payroll" value={fmtK(totalMonthly)}
          bg={C.purpleL} border={C.purpleB} color={C.purple} />
        <KPICard icon="✅" label={`Paid (${payMonth})`} value={fmtK(paidThisMonth)}
          bg={C.greenL} border={C.greenB} color={C.green} />
        <KPICard icon="⏳" label="Pending this month" value={fmtK(Math.max(0, totalMonthly - paidThisMonth))}
          bg={C.amberL} border={C.amberB} color={C.amber} />
      </div>

      {/* Pay-period selector + add employee */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ fontSize: 13, fontWeight: 700, color: C.slate }}>Pay Month:</label>
        <input type="month" value={payMonth} onChange={e => setPayMonth(e.target.value)} style={inp()} />
        <button onClick={() => setShowEmpForm(s => !s)}
          style={btn(C.indigo, '#fff', { marginLeft: 'auto' })}>
          {showEmpForm ? '✕ Cancel' : '＋ Add Employee / Contractor'}
        </button>
      </div>

      {/* Add employee form */}
      {showEmpForm && (
        <div style={card({ marginBottom: 16, border: `2px solid ${C.indigoB}` })}>
          <div style={{ fontWeight: 700, fontSize: 14, color: C.indigo, marginBottom: 14 }}>
            New Team Member
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            {[
              [  'Name *', 'name', 'text', 'John Doe'],
              ['Job Title', 'role', 'text', 'Frontend Dev'],
              ['Email', 'email', 'email', 'john@company.com'],
              ['Monthly Salary *', 'monthly_salary', 'number', '50000'],
              ['Bank / Payment Ref', 'bank_ref', 'text', 'ICICI-XXXX'],
              ['Joined On', 'joined_on', 'date', ''],
            ].map(([label, key, type, ph], i) => (
              <div key={i}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.slate,
                  textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>{label}</label>
                <input type={type} value={emp[key]} placeholder={ph}
                  onChange={e => setEmp(p => ({ ...p, [key]: e.target.value }))}
                  style={inp({ width: '100%' })} />
              </div>
            ))}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.slate,
                textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>Type</label>
              <select value={emp.type} onChange={e => setEmp(p => ({ ...p, type: e.target.value }))}
                style={inp({ width: '100%' })}>
                <option value="employee">Employee (Full-time)</option>
                <option value="contractor">Contractor / Freelancer</option>
                <option value="intern">Intern</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.slate,
                textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>Currency</label>
              <select value={emp.currency} onChange={e => setEmp(p => ({ ...p, currency: e.target.value }))}
                style={inp({ width: '100%' })}>
                {CURRENCY_OPTIONS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 14 }}>
            <button onClick={() => setShowEmpForm(false)} style={btn(C.slateL, C.slate)}>Cancel</button>
            <button onClick={saveEmployee} disabled={saving || !emp.name || !emp.monthly_salary}
              style={btn(saving ? C.slateB : C.indigo, '#fff')}>
              {saving ? '⏳ Saving…' : '💾 Add Member'}
            </button>
          </div>
        </div>
      )}

      {/* Employee list */}
      <div style={card({ padding: 0, overflow: 'hidden' })}>
        {employees.length === 0 ? (
          <div style={{ padding: '32px 20px', textAlign: 'center', color: C.slate, fontSize: 13 }}>
            No team members added yet. Add your first employee or contractor above.
          </div>
        ) : (
          <>
            <div style={{ display: 'grid',
              gridTemplateColumns: '1fr 140px 80px 110px 100px 100px',
              padding: '10px 16px', background: C.slateL,
              borderBottom: `1px solid ${C.slateB}`,
              fontSize: 11, fontWeight: 700, color: C.slate,
              textTransform: 'uppercase', letterSpacing: '.04em' }}>
              <div>Name & Role</div><div>Type</div><div>Currency</div>
              <div style={{ textAlign: 'right' }}>Monthly</div>
              <div style={{ textAlign: 'right' }}>Annual</div>
              <div style={{ textAlign: 'right' }}>Action</div>
            </div>
            {employees.map(e => (
              <div key={e.id} style={{ display: 'grid',
                gridTemplateColumns: '1fr 140px 80px 110px 100px 100px',
                padding: '12px 16px',
                borderBottom: `1px solid ${C.slateB}`,
                alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{e.name}</div>
                  <div style={{ fontSize: 11, color: C.slate }}>{e.role}{e.email ? ` · ${e.email}` : ''}</div>
                  {e.bank_ref && <div style={{ fontSize: 10, color: C.slate, marginTop: 2 }}>Ref: {e.bank_ref}</div>}
                </div>
                <div>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, fontWeight: 700,
                    background: e.type === 'employee' ? C.blueL : e.type === 'contractor' ? C.amberL : C.greenL,
                    color: e.type === 'employee' ? C.blue : e.type === 'contractor' ? C.amber : C.green }}>
                    {e.type}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: C.slate, fontWeight: 600 }}>{e.currency || 'INR'}</div>
                <div style={{ textAlign: 'right', fontWeight: 700, fontSize: 13, color: '#0f172a' }}>
                  {fmt(e.monthly_salary, e.currency === 'INR' ? '₹' : e.currency + ' ')}
                </div>
                <div style={{ textAlign: 'right', fontSize: 12, color: C.slate, fontWeight: 600 }}>
                  {fmt((e.monthly_salary || 0) * 12, e.currency === 'INR' ? '₹' : e.currency + ' ')}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <button
                    onClick={() => payNow(e)}
                    disabled={paying === e.id}
                    style={btn(paying === e.id ? C.slateB : C.green, '#fff',
                      { padding: '5px 12px', fontSize: 12 })}>
                    {paying === e.id ? '⏳' : '✅ Mark Paid'}
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Recent salary transactions */}
      {txns.length > 0 && (
        <div style={card({ marginTop: 20 })}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', marginBottom: 12 }}>
            🕐 Recent Salary Payments
          </div>
          {txns.slice(0, 6).map(t => <TxnRow key={t.id} txn={t} compact />)}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TAB: Investments
// ═══════════════════════════════════════════════════════════════════════════════
function InvestmentsTab({ token, showToast, onRefresh }) {
  const [investors,  setInvestors]  = useState([])
  const [txns,       setTxns]       = useState([])
  const [loading,    setLoading]    = useState(true)
  const [showForm,   setShowForm]   = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [form, setForm] = useState({
    name: '', type: 'angel', amount: '', currency: 'INR',
    equity_pct: '', round: 'Pre-seed', date: today(),
    contact: '', terms: '', notes: ''
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [id, td] = await Promise.all([
        apiFetch('/api/admin/finance/payroll/investors', token),
        apiFetch('/api/admin/finance/transactions?type=investment', token),
      ])
      setInvestors(id.investors || [])
      setTxns(td.transactions || [])
    } catch {
      setInvestors([]); setTxns([])
    }
    setLoading(false)
  }, [token])

  useEffect(() => { load() }, [load])

  const saveInvestor = async () => {
    if (!form.name || !form.amount) return
    setSaving(true)
    try {
      const inv = { ...form, amount: parseFloat(form.amount), equity_pct: parseFloat(form.equity_pct) || 0 }
      await apiFetch('/api/admin/finance/payroll/investors', token, 'POST', inv)
      // Also record a finance transaction
      await apiFetch('/api/admin/finance/transactions', token, 'POST', {
        type: 'investment', category: 'investment',
        amount: parseFloat(form.amount), currency: form.currency,
        description: `Investment — ${form.name} (${form.round})`,
        vendor: form.name, date: form.date, reference: form.round,
        notes: form.terms, tags: ['investment', form.round.toLowerCase().replace(/\s+/g, '-')],
      })
      showToast('Investor added & transaction recorded', 'success')
      setShowForm(false)
      setForm({ name: '', type: 'angel', amount: '', currency: 'INR',
        equity_pct: '', round: 'Pre-seed', date: today(), contact: '', terms: '', notes: '' })
      load(); onRefresh?.()
    } catch (e) { showToast(e.message, 'error') }
    setSaving(false)
  }

  const totalFunded = investors.reduce((a, i) => a + (i.amount || 0), 0)
  const totalEquity = investors.reduce((a, i) => a + (i.equity_pct || 0), 0)

  const ROUNDS = ['Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Bridge', 'Other']
  const INV_TYPES = ['angel', 'vc', 'corporate', 'govt_grant', 'bootstrapped', 'loan']

  if (loading) return <Loader />

  return (
    <div>
      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))',
        gap: 12, marginBottom: 20 }}>
        <KPICard icon="💰" label="Total Funding" value={fmtK(totalFunded)}
          bg={C.purpleL} border={C.purpleB} color={C.purple} />
        <KPICard icon="📊" label="Investors" value={investors.length}
          bg={C.blueL} border={C.blueB} color={C.blue} />
        <KPICard icon="📈" label="Equity Given" value={`${totalEquity.toFixed(1)}%`}
          bg={C.amberL} border={C.amberB} color={C.amber} />
        <KPICard icon="🔓" label="Founder Holds"
          value={`${Math.max(0, 100 - totalEquity).toFixed(1)}%`}
          bg={C.greenL} border={C.greenB} color={C.green} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button onClick={() => setShowForm(s => !s)}
          style={btn(C.indigo, '#fff')}>
          {showForm ? '✕ Cancel' : '＋ Add Investor / Funding'}
        </button>
      </div>

      {/* Add investor form */}
      {showForm && (
        <div style={card({ marginBottom: 16, border: `2px solid ${C.purpleB}` })}>
          <div style={{ fontWeight: 700, fontSize: 14, color: C.purple, marginBottom: 14 }}>
            New Investor / Funding Entry
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            {[
              ['Investor / Org. Name *', 'name', 'text', 'Sequoia Capital'],
              ['Contact Person', 'contact', 'text', 'Rajan Kumar'],
              ['Funding Round', 'round_select'],
              ['Type', 'type_select'],
              ['Amount *', 'amount', 'number', '5000000'],
              ['Currency', 'currency_select'],
              ['Equity % (0 for grants)', 'equity_pct', 'number', '5.0'],
              ['Date', 'date', 'date', ''],
              ['Terms / Conditions', 'terms', 'text', 'Convertible note @6%'],
            ].map(([label, key, type, ph], i) => (
              <div key={i}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.slate,
                  textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>{label}</label>
                {key === 'round_select' ? (
                  <select value={form.round} onChange={e => setForm(p => ({ ...p, round: e.target.value }))}
                    style={inp({ width: '100%' })}>
                    {ROUNDS.map(r => <option key={r}>{r}</option>)}
                  </select>
                ) : key === 'type_select' ? (
                  <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                    style={inp({ width: '100%' })}>
                    {INV_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
                  </select>
                ) : key === 'currency_select' ? (
                  <select value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}
                    style={inp({ width: '100%' })}>
                    {CURRENCY_OPTIONS.map(c => <option key={c}>{c}</option>)}
                  </select>
                ) : (
                  <input type={type} value={form[key]} placeholder={ph}
                    onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                    style={inp({ width: '100%' })} />
                )}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.slate,
              textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>Notes</label>
            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              rows={2} placeholder="Additional information…"
              style={{ ...inp({ width: '100%' }), resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 14 }}>
            <button onClick={() => setShowForm(false)} style={btn(C.slateL, C.slate)}>Cancel</button>
            <button onClick={saveInvestor} disabled={saving || !form.name || !form.amount}
              style={btn(saving ? C.slateB : C.purple, '#fff')}>
              {saving ? '⏳ Saving…' : '💾 Add Investor'}
            </button>
          </div>
        </div>
      )}

      {/* Investor cap table */}
      <div style={card({ padding: 0, overflow: 'hidden', marginBottom: 20 })}>
        {investors.length === 0 ? (
          <div style={{ padding: '32px 20px', textAlign: 'center', color: C.slate, fontSize: 13 }}>
            No investors recorded yet. Add your first funding round above.
          </div>
        ) : (
          <>
            <div style={{ display: 'grid',
              gridTemplateColumns: '1fr 100px 90px 110px 80px 100px',
              padding: '10px 16px', background: C.slateL,
              borderBottom: `1px solid ${C.slateB}`,
              fontSize: 11, fontWeight: 700, color: C.slate,
              textTransform: 'uppercase', letterSpacing: '.04em' }}>
              <div>Investor</div><div>Round</div><div>Type</div>
              <div style={{ textAlign: 'right' }}>Amount</div>
              <div style={{ textAlign: 'right' }}>Equity</div>
              <div>Date</div>
            </div>
            {investors.map(inv => (
              <div key={inv.id} style={{ display: 'grid',
                gridTemplateColumns: '1fr 100px 90px 110px 80px 100px',
                padding: '12px 16px',
                borderBottom: `1px solid ${C.slateB}`, alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{inv.name}</div>
                  {inv.contact && <div style={{ fontSize: 11, color: C.slate }}>{inv.contact}</div>}
                  {inv.terms && <div style={{ fontSize: 10, color: C.slate, marginTop: 1, fontStyle: 'italic' }}>{inv.terms}</div>}
                </div>
                <div>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, fontWeight: 700,
                    background: C.purpleL, color: C.purple }}>{inv.round}</span>
                </div>
                <div style={{ fontSize: 12, color: C.slate, textTransform: 'capitalize' }}>
                  {(inv.type || '').replace(/_/g, ' ')}
                </div>
                <div style={{ textAlign: 'right', fontWeight: 800, fontSize: 14, color: C.purple }}>
                  {fmt(inv.amount, inv.currency === 'INR' ? '₹' : inv.currency + ' ')}
                </div>
                <div style={{ textAlign: 'right', fontWeight: 700, fontSize: 13,
                  color: (inv.equity_pct || 0) > 0 ? C.amber : C.green }}>
                  {(inv.equity_pct || 0) > 0 ? `${inv.equity_pct}%` : 'Grant'}
                </div>
                <div style={{ fontSize: 12, color: C.slate }}>{inv.date?.slice(0, 10)}</div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Investment transactions */}
      {txns.length > 0 && (
        <div style={card()}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', marginBottom: 12 }}>
            📋 Investment Transactions
          </div>
          {txns.map(t => <TxnRow key={t.id} txn={t} compact />)}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TAB: Analytics
// ═══════════════════════════════════════════════════════════════════════════════
function AnalyticsTab({ summary, loading }) {
  const [period, setPeriod] = useState('6m') // 1m | 3m | 6m | 1y | all
  if (loading) return <Loader />

  const s = summary || {}
  const monthly = s.monthly || []

  const byExpCat = (s.by_category || []).filter(c => c.flow === 'expense')
  const byIncCat = (s.by_category || []).filter(c => c.flow === 'income')
  const totalExp = byExpCat.reduce((a, c) => a + c.total, 0)
  const totalInc = byIncCat.reduce((a, c) => a + c.total, 0)

  const allMonths = monthly.slice(-({ '1m': 1, '3m': 3, '6m': 6, '1y': 12, 'all': 999 }[period] || 6))
  const maxVal = Math.max(...allMonths.map(m => Math.max(m.income || 0, m.expenses || 0)), 1)

  return (
    <div>
      {/* Period selector */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {[['1m', '1 Month'], ['3m', '3 Months'], ['6m', '6 Months'], ['1y', '1 Year'], ['all', 'All Time']].map(([id, label]) => (
          <button key={id} onClick={() => setPeriod(id)}
            style={{ padding: '6px 14px', borderRadius: 8, border: 'none', fontFamily: 'inherit',
              fontWeight: 600, fontSize: 12, cursor: 'pointer',
              background: period === id ? C.indigo : C.indigoL,
              color:      period === id ? '#fff'   : C.indigo }}>
            {label}
          </button>
        ))}
      </div>

      {/* Monthly bars */}
      {allMonths.length > 0 ? (
        <div style={card({ marginBottom: 20 })}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 20 }}>
            📊 Monthly Income vs Expenses
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', height: 160, overflowX: 'auto' }}>
            {allMonths.map((m, i) => {
              const incH = Math.round(((m.income   || 0) / maxVal) * 140)
              const expH = Math.round(((m.expenses || 0) / maxVal) * 140)
              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: 4, minWidth: 52, flex: '1 0 52px' }}>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 140 }}>
                    <div title={`Income: ${fmt(m.income)}`}
                      style={{ width: 18, height: incH, background: C.green,
                        borderRadius: '4px 4px 0 0', transition: 'height .3s' }} />
                    <div title={`Expenses: ${fmt(m.expenses)}`}
                      style={{ width: 18, height: expH, background: C.red,
                        borderRadius: '4px 4px 0 0', transition: 'height .3s' }} />
                  </div>
                  <div style={{ fontSize: 10, color: C.slate, fontWeight: 600,
                    whiteSpace: 'nowrap' }}>{m.month}</div>
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 12, justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.slate }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: C.green }} />Income
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.slate }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: C.red }} /> Expenses
            </div>
          </div>
        </div>
      ) : (
        <div style={card({ marginBottom: 20, textAlign: 'center', color: C.slate, padding: 32 })}>
          Add transactions in the Ledger tab to see monthly trends here.
        </div>
      )}

      {/* Category breakdowns side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div style={card()}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', marginBottom: 14 }}>
            💸 Expense by Category
          </div>
          {byExpCat.length === 0 ? (
            <div style={{ color: C.slate, fontSize: 13, textAlign: 'center', padding: 20 }}>No expense data yet.</div>
          ) : (
            byExpCat.sort((a, b) => b.total - a.total).map((c, i) => {
              const cat = catById(c.category)
              const pct = totalExp > 0 ? (c.total / totalExp) * 100 : 0
              return (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>{cat.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: cat.color }}>{fmt(c.total)}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: C.slateB }}>
                    <div style={{ height: '100%', borderRadius: 3, background: cat.color,
                      width: `${pct.toFixed(1)}%`, transition: 'width .4s' }} />
                  </div>
                  <div style={{ fontSize: 10, color: C.slate, marginTop: 2 }}>{pct.toFixed(1)}% of expenses</div>
                </div>
              )
            })
          )}
        </div>
        <div style={card()}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', marginBottom: 14 }}>
            💵 Income by Category
          </div>
          {byIncCat.length === 0 ? (
            <div style={{ color: C.slate, fontSize: 13, textAlign: 'center', padding: 20 }}>No income data yet.</div>
          ) : (
            byIncCat.sort((a, b) => b.total - a.total).map((c, i) => {
              const cat = catById(c.category)
              const pct = totalInc > 0 ? (c.total / totalInc) * 100 : 0
              return (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>{cat.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: cat.color }}>{fmt(c.total)}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: C.slateB }}>
                    <div style={{ height: '100%', borderRadius: 3, background: cat.color,
                      width: `${pct.toFixed(1)}%`, transition: 'width .4s' }} />
                  </div>
                  <div style={{ fontSize: 10, color: C.slate, marginTop: 2 }}>{pct.toFixed(1)}% of income</div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Monthly P&L table */}
      {allMonths.length > 0 && (
        <div style={card({ padding: 0, overflow: 'hidden' })}>
          <div style={{ padding: '12px 16px', fontWeight: 700, fontSize: 13, background: C.slateL,
            borderBottom: `1px solid ${C.slateB}` }}>📋 Monthly P&L Summary</div>
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr 1fr 80px',
            padding: '9px 16px', background: C.slateL,
            borderBottom: `1px solid ${C.slateB}`,
            fontSize: 11, fontWeight: 700, color: C.slate,
            textTransform: 'uppercase', letterSpacing: '.04em' }}>
            <div>Month</div>
            <div style={{ textAlign: 'right' }}>Income</div>
            <div style={{ textAlign: 'right' }}>Expenses</div>
            <div style={{ textAlign: 'right' }}>Net P&L</div>
            <div style={{ textAlign: 'right' }}>Txns</div>
          </div>
          {[...allMonths].reverse().map((m, i) => {
            const net = (m.income || 0) - (m.expenses || 0)
            return (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr 1fr 80px',
                padding: '10px 16px', borderBottom: `1px solid ${C.slateB}`, alignItems: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{m.month}</div>
                <div style={{ textAlign: 'right', fontWeight: 700, color: C.green }}>{fmt(m.income)}</div>
                <div style={{ textAlign: 'right', fontWeight: 700, color: C.red }}>{fmt(m.expenses)}</div>
                <div style={{ textAlign: 'right', fontWeight: 800,
                  color: net >= 0 ? C.green : C.red }}>{fmt(net)}</div>
                <div style={{ textAlign: 'right', fontSize: 12, color: C.slate }}>{m.count || 0}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SHARED: row components
// ═══════════════════════════════════════════════════════════════════════════════
function TxnRow({ txn, compact }) {
  const t = typeById(txn.type)
  const c = catById(txn.category)
  const isOut = ['expense', 'salary'].includes(txn.type)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12,
      padding: compact ? '8px 0' : '10px 0',
      borderBottom: `1px solid ${C.slateB}` }}>
      <div style={{ width: 34, height: 34, borderRadius: 8, background: t.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, flexShrink: 0 }}>{t.label.split(' ')[0]}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap',
          overflow: 'hidden', textOverflow: 'ellipsis' }}>{txn.description}</div>
        <div style={{ fontSize: 11, color: C.slate }}>{txn.date?.slice(0, 10)}
          {txn.vendor ? ` · ${txn.vendor}` : ''}
          <span style={{ marginLeft: 6, padding: '1px 6px', borderRadius: 999, fontSize: 10,
            background: c.color + '22', color: c.color, fontWeight: 700 }}>{c.label}</span>
        </div>
      </div>
      <div style={{ fontWeight: 800, fontSize: 14,
        color: isOut ? C.red : C.green, whiteSpace: 'nowrap' }}>
        {isOut ? '-' : '+'}{fmt(txn.amount, txn.currency === 'INR' ? '₹' : (txn.currency || '') + ' ')}
      </div>
    </div>
  )
}

function LedgerRow({ txn, onEdit, onDelete, deleting }) {
  const t = typeById(txn.type)
  const c = catById(txn.category)
  const isOut = ['expense', 'salary'].includes(txn.type)
  return (
    <div style={{ display: 'grid',
      gridTemplateColumns: '80px 1fr 120px 90px 100px 80px 90px',
      padding: '10px 16px', borderBottom: `1px solid ${C.slateB}`,
      alignItems: 'center' }}>
      <div style={{ fontSize: 12, color: C.slate, fontWeight: 600 }}>{txn.date?.slice(0, 10)}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap',
          overflow: 'hidden', textOverflow: 'ellipsis' }}>{txn.description}</div>
        {txn.vendor && <div style={{ fontSize: 11, color: C.slate }}>{txn.vendor}</div>}
        {(txn.tags || []).length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 3 }}>
            {txn.tags.map((tag, i) => (
              <span key={i} style={{ fontSize: 10, padding: '1px 5px', borderRadius: 999,
                background: C.indigoL, color: C.indigo, fontWeight: 600 }}>#{tag}</span>
            ))}
          </div>
        )}
      </div>
      <div>
        <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 999, fontWeight: 700,
          background: c.color + '22', color: c.color }}>{c.label}</span>
      </div>
      <div style={{ textAlign: 'right' }}>
        <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 999, fontWeight: 700,
          background: t.bg, color: t.color }}>{t.label}</span>
      </div>
      <div style={{ textAlign: 'right', fontWeight: 800, fontSize: 13,
        color: isOut ? C.red : C.green, whiteSpace: 'nowrap' }}>
        {isOut ? '-' : '+'}{fmt(txn.amount, txn.currency === 'INR' ? '₹' : (txn.currency || '') + ' ')}
      </div>
      <div style={{ fontSize: 11, color: C.slate, whiteSpace: 'nowrap',
        overflow: 'hidden', textOverflow: 'ellipsis' }}>{txn.reference}</div>
      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
        <button onClick={onEdit}
          style={{ padding: '4px 8px', fontSize: 11, borderRadius: 6, border: 'none',
            fontFamily: 'inherit', cursor: 'pointer', fontWeight: 600,
            background: C.indigoL, color: C.indigo }}>Edit</button>
        <button onClick={onDelete} disabled={deleting}
          style={{ padding: '4px 8px', fontSize: 11, borderRadius: 6, border: 'none',
            fontFamily: 'inherit', cursor: 'pointer', fontWeight: 600,
            background: C.redL, color: C.red }}>
          {deleting ? '…' : 'Del'}
        </button>
      </div>
    </div>
  )
}

function MonthlyBars({ data }) {
  const maxVal = Math.max(...data.map(m => Math.max(m.income || 0, m.expenses || 0)), 1)
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', height: 120, overflowX: 'auto' }}>
      {data.slice(-8).map((m, i) => {
        const incH = Math.round(((m.income   || 0) / maxVal) * 100)
        const expH = Math.round(((m.expenses || 0) / maxVal) * 100)
        return (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 4, minWidth: 40, flex: '1 0 40px' }}>
            <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 100 }}>
              <div style={{ width: 14, height: incH, background: C.green, borderRadius: '3px 3px 0 0' }} />
              <div style={{ width: 14, height: expH, background: C.red, borderRadius: '3px 3px 0 0' }} />
            </div>
            <div style={{ fontSize: 9, color: C.slate, fontWeight: 600, whiteSpace: 'nowrap' }}>{m.month}</div>
          </div>
        )
      })}
    </div>
  )
}

function CategoryBars({ data, total, color }) {
  if (!data || data.length === 0)
    return <div style={{ color: C.slate, fontSize: 12, textAlign: 'center', padding: 12 }}>No data yet.</div>
  const bar = color || C.red
  return (
    <>
      {data.sort((a, b) => b.total - a.total).slice(0, 6).map((c, i) => {
        const cat = catById(c.category)
        const pct = total > 0 ? (c.total / total) * 100 : 0
        return (
          <div key={i} style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 11, color: '#0f172a', fontWeight: 600 }}>{cat.label}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: cat.color }}>{fmtK(c.total)}</span>
            </div>
            <div style={{ height: 5, borderRadius: 3, background: C.slateB }}>
              <div style={{ height: '100%', borderRadius: 3, background: cat.color,
                width: `${pct.toFixed(1)}%` }} />
            </div>
          </div>
        )
      })}
    </>
  )
}

function Loader({ inline }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: inline ? 16 : 48, color: C.slate, fontSize: 13, gap: 8 }}>
      <div style={{ width: 20, height: 20, border: `3px solid ${C.slateB}`,
        borderTop: `3px solid ${C.indigo}`, borderRadius: '50%',
        animation: 'spin .7s linear infinite' }} />
      Loading…
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ROOT EXPORT
// ═══════════════════════════════════════════════════════════════════════════════
const TABS = [
  { id: 'overview',    label: '📊 Overview'    },
  { id: 'ledger',      label: '📒 Ledger'      },
  { id: 'payroll',     label: '👨‍💼 Payroll'     },
  { id: 'investments', label: '💰 Investments' },
  { id: 'analytics',   label: '📈 Analytics'   },
]

export default function FinancePanel({ showToast }) {
  const { token } = useAuth()
  const [tab,     setTab]     = useState('overview')
  const [summary, setSummary] = useState(null)
  const [recent,  setRecent]  = useState([])
  const [loadSum, setLoadSum] = useState(true)

  const loadSummary = useCallback(async () => {
    setLoadSum(true)
    try {
      const d = await apiFetch('/api/admin/finance/summary', token)
      setSummary(d.summary || d)
      setRecent(d.recent_transactions || [])
    } catch {
      setSummary({})
      setRecent([])
    }
    setLoadSum(false)
  }, [token])

  useEffect(() => { loadSummary() }, [loadSummary])

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px', fontFamily: 'inherit' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12,
            background: 'linear-gradient(135deg,#059669,#10b981)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, flexShrink: 0 }}>💹</div>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0f172a' }}>
              Finance Manager
            </h2>
            <p style={{ margin: 0, fontSize: 13, color: C.slate }}>
              Track every rupee — API costs, payroll, investments, income and operational expenses
            </p>
          </div>
          <button onClick={loadSummary} disabled={loadSum}
            style={{ marginLeft: 'auto', ...btn(C.slateL, C.slate, { fontSize: 12 }) }}>
            🔄 Refresh
          </button>
        </div>
      </div>

      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      <div>
        {tab === 'overview'    && <OverviewTab    summary={summary} recentTxns={recent} loading={loadSum} onNavigate={setTab} />}
        {tab === 'ledger'      && <LedgerTab      token={token} showToast={showToast} onRefresh={loadSummary} />}
        {tab === 'payroll'     && <PayrollTab     token={token} showToast={showToast} onRefresh={loadSummary} />}
        {tab === 'investments' && <InvestmentsTab token={token} showToast={showToast} onRefresh={loadSummary} />}
        {tab === 'analytics'   && <AnalyticsTab   summary={summary} loading={loadSum} />}
      </div>
    </div>
  )
}
