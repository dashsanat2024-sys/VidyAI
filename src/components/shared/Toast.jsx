export default function Toast({ msg, type, show }) {
  return (
    <div className={`toast ${show ? 'show' : ''} ${type}`}>{msg}</div>
  )
}
