import { useState } from 'react'
import { apiPost } from '../utils/api'

const PLAN_INFO = {
  'student-pro':    { name: 'Student Pro',       price: '₹149/month',    amount: '₹149', color: '#6366f1' },
  'school-starter': { name: 'School Starter',    price: '₹999/month',    amount: '₹999', color: '#0891b2' },
  'school-growth':  { name: 'School Growth',     price: '₹2,499/month',  amount: '₹2,499', color: '#0891b2' },
  'coaching':       { name: 'Coaching Institute', price: '₹990/month',   amount: '₹990', color: '#059669' },
}

function loadRazorpaySDK() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true)
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export default function PaymentModal({ plan, token, userEmail, userName, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  if (!plan) return null

  const info = PLAN_INFO[plan.id] || { name: plan.name, price: plan.price, amount: plan.price, color: '#6366f1' }

  const handlePay = async () => {
    setLoading(true)
    setError(null)
    try {
      const sdkLoaded = await loadRazorpaySDK()
      if (!sdkLoaded) throw new Error('Razorpay SDK failed to load. Check your internet connection.')

      const order = await apiPost('/payments/create-order', { plan_id: plan.id }, token)
      if (order.error) throw new Error(order.error)

      const options = {
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: 'Arthavi',
        description: info.name,
        order_id: order.order_id,
        prefill: {
          name: userName || '',
          email: userEmail || '',
        },
        theme: { color: info.color },
        modal: {
          ondismiss: () => setLoading(false),
        },
        handler: async (response) => {
          try {
            const result = await apiPost('/payments/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan_id: plan.id,
            }, token)
            if (result.error) throw new Error(result.error)
            onSuccess && onSuccess(result)
            onClose()
          } catch (e) {
            setError(e.message || 'Payment verification failed. Contact support@arthavi.in')
            setLoading(false)
          }
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', (resp) => {
        setError(`Payment failed: ${resp.error.description}`)
        setLoading(false)
      })
      rzp.open()
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, padding: 16,
      }}
    >
      <div style={{
        background: '#fff', borderRadius: 20, padding: '32px 28px',
        maxWidth: 420, width: '100%', boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
              UPGRADE PLAN
            </div>
            <h2 style={{ margin: '4px 0 0', fontSize: 22, color: '#0f172a', fontWeight: 800 }}>
              {info.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 20, color: '#94a3b8', lineHeight: 1, padding: 4,
            }}
          >✕</button>
        </div>

        {/* Price */}
        <div style={{
          background: '#f8fafc', borderRadius: 12, padding: '16px 20px',
          marginBottom: 20, borderLeft: `4px solid ${info.color}`,
        }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: info.color }}>{info.amount}</div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{info.price} · Renews automatically</div>
        </div>

        {/* Payment methods */}
        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 20, textAlign: 'center', letterSpacing: 0.5 }}>
          🔒 Secure payment via Razorpay &nbsp;·&nbsp; UPI &nbsp;·&nbsp; Cards &nbsp;·&nbsp; Net Banking &nbsp;·&nbsp; EMI
        </div>

        {error && (
          <div style={{
            padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13,
            background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5',
          }}>
            {error}
          </div>
        )}

        <button
          onClick={handlePay}
          disabled={loading}
          style={{
            width: '100%', padding: '15px', background: loading ? '#c7d2fe' : info.color,
            color: '#fff', border: 'none', borderRadius: 10, fontSize: 16, fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer', transition: 'background .2s',
          }}
        >
          {loading ? 'Opening Razorpay…' : `Pay ${info.amount}`}
        </button>

        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '11px', marginTop: 10,
            background: 'transparent', border: '1.5px solid #e2e8f0',
            borderRadius: 10, fontSize: 14, color: '#64748b', cursor: 'pointer',
          }}
        >
          Cancel
        </button>

        <p style={{ fontSize: 11, color: '#cbd5e1', marginTop: 14, textAlign: 'center' }}>
          By paying you agree to our Terms &amp; Conditions. Refunds as per our Refund Policy.
        </p>
      </div>
    </div>
  )
}
