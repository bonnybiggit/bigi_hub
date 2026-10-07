const platforms = ['Facebook', 'TikTok', 'Instagram', 'YouTube']

function SocialRail() {
  return (
    <nav className="social-rail" aria-label="Social links - demo destinations">
      {platforms.map((platform) => (
        <a key={platform} href={`https://example.com/?platform=${platform.toLowerCase()}`} target="_blank" rel="noopener noreferrer" aria-label={`${platform} (demo link, opens in a new tab)`} title={`${platform} · Demo link`}>
          <img src={`${import.meta.env.BASE_URL}brands/${platform.toLowerCase()}.svg`} width="22" height="22" alt="" aria-hidden="true" />
        </a>
      ))}
      <span className="social-rail-note">Demo</span>
    </nav>
  )
}

export default SocialRail
