import { getDailyQuote } from '../../lib/quotes'

export default function QuoteCard() {
  const quote = getDailyQuote()
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(45,212,191,0.06), rgba(129,140,248,0.04))',
      border: '1px solid rgba(45,212,191,0.12)',
      borderRadius: '16px',
      padding: '16px 18px',
      marginBottom: '20px',
    }}>
      <div style={{
        fontSize: '10px',
        fontWeight: 600,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: '#2dd4bf',
        marginBottom: '8px',
        fontFamily: 'var(--font-mono)',
      }}>
        Daily Anchor
      </div>
      <p style={{
        fontSize: '13px',
        lineHeight: '1.65',
        color: '#9ca3af',
        margin: 0,
        fontStyle: 'italic',
        fontFamily: 'var(--font-mono)',
      }}>
        "{quote}"
      </p>
    </div>
  )
}
