export const metadata = {
  title: 'Creative Cookbook Companion',
  description: 'AI recipes from your fridge photos',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'Inter, system-ui, Arial, sans-serif', color: '#5a3e2b' }}>
        {/* Background gradient */}
        <div style={{
          position: 'fixed', inset: 0, zIndex: -2,
          background: 'linear-gradient(135deg,#ffffff 0%, #fff7cc 100%)'
        }} />

        {/* Soft radial lights */}
        <div style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: -120, left: -120, width: 360, height: 360, borderRadius: '50%', filter: 'blur(80px)', background: 'rgba(255,223,128,0.45)' }} />
          <div style={{ position: 'absolute', bottom: -140, right: -140, width: 420, height: 420, borderRadius: '50%', filter: 'blur(90px)', background: 'rgba(255,240,180,0.5)' }} />
          <div style={{ position: 'absolute', top: 120, right: -100, width: 280, height: 280, borderRadius: '50%', filter: 'blur(70px)', background: 'rgba(255,200,100,0.35)' }} />
        </div>

        {/* Decorative fruits/foods */}
        <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none' }}>
          <span style={{ position: 'absolute', top: 60, left: 40, fontSize: 40, opacity: 0.25, transform: 'rotate(-12deg)' }}>🍎</span>
          <span style={{ position: 'absolute', top: 180, right: 60, fontSize: 44, opacity: 0.22, transform: 'rotate(18deg)' }}>🍌</span>
          <span style={{ position: 'absolute', top: 320, left: 120, fontSize: 42, opacity: 0.22, transform: 'rotate(10deg)' }}>🥑</span>
          <span style={{ position: 'absolute', bottom: 140, right: 120, fontSize: 46, opacity: 0.22, transform: 'rotate(-8deg)' }}>🍓</span>
          <span style={{ position: 'absolute', bottom: 60, left: 60, fontSize: 42, opacity: 0.22, transform: 'rotate(6deg)' }}>🥕</span>
          <span style={{ position: 'absolute', top: 120, left: '50%', transform: 'translateX(-50%) rotate(-6deg)', fontSize: 40, opacity: 0.2 }}>🍇</span>
          <span style={{ position: 'absolute', top: 80, right: 220, fontSize: 38, opacity: 0.18, transform: 'rotate(12deg)' }}>🍍</span>
          <span style={{ position: 'absolute', bottom: 200, left: 220, fontSize: 36, opacity: 0.18, transform: 'rotate(-14deg)' }}>🍒</span>
          <span style={{ position: 'absolute', top: 260, right: 260, fontSize: 42, opacity: 0.16, transform: 'rotate(4deg)' }}>🍉</span>
          <span style={{ position: 'absolute', bottom: 100, right: 40, fontSize: 36, opacity: 0.2, transform: 'rotate(10deg)' }}>🍋</span>
          <span style={{ position: 'absolute', top: 30, left: 300, fontSize: 34, opacity: 0.16, transform: 'rotate(-18deg)' }}>🍑</span>
          <span style={{ position: 'absolute', bottom: 40, left: '45%', fontSize: 34, opacity: 0.16, transform: 'translateX(-50%) rotate(8deg)' }}>🌽</span>
          <span style={{ position: 'absolute', top: 380, left: 40, fontSize: 38, opacity: 0.16, transform: 'rotate(-6deg)' }}>🥦</span>
          <span style={{ position: 'absolute', bottom: 260, right: 300, fontSize: 36, opacity: 0.16, transform: 'rotate(6deg)' }}>🥥</span>
        </div>

        {/* Content container */}
        <div style={{ minHeight: '100vh', position: 'relative' }}>
          {children}
        </div>
      </body>
    </html>
  );
}
