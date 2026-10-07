import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'
import NewsTicker from '../components/NewsTicker.jsx'
import SocialRail from '../components/SocialRail.jsx'
import WhatsAppButton from '../components/WhatsAppButton.jsx'
import '../styles/layout.css'
import '../styles/shared-public.css'

function MainLayout({ children }) {
  return (
    <div className="main-layout">
      <div className="site-topbar"><NewsTicker /><Header /></div>
      <main className="main-content">{children}</main>
      <Footer />
      <SocialRail />
      <WhatsAppButton />
    </div>
  )
}

export default MainLayout
