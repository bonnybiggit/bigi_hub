import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'
import '../styles/layout.css'

function MainLayout({ children }) {
  return (
    <div className="main-layout">
      <Header />
      <main className="main-content">{children}</main>
      <Footer />
    </div>
  )
}

export default MainLayout
