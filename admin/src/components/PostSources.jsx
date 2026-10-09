export default function PostSources({ text, image, imageText, evidence, metadata }) {
  return <aside className="panel assistant-sources" aria-labelledby="assistant-source-title">
    <h2 id="assistant-source-title">Original source</h2>
    {metadata?.provider === 'thenewsapi' && <p>Sports News from <a href={metadata.url} target="_blank" rel="noopener noreferrer">{metadata.attribution}</a>. Collected via The News API.</p>}
    {metadata?.provider === 'manual' && <p>Original publisher: <a href={metadata.url} target="_blank" rel="noopener noreferrer">{metadata.attribution}</a>. Manually entered summary.</p>}
    {image?.dataUrl && <><a href={image.dataUrl} download={image.name}>Download original flyer</a><img className="assistant-flyer" src={image.dataUrl} alt="Original uploaded flyer for source verification" /><p>{image.name}</p></>}
    {text?.trim() && <><h3>Copied text</h3><pre className="assistant-source-text">{text}</pre></>}
    {imageText && <details><summary>AI image transcription — verify against the flyer</summary><pre className="assistant-source-text">{imageText}</pre></details>}
    {evidence && Object.keys(evidence).length > 0 && <details><summary>Extraction evidence</summary><dl className="assistant-facts">{Object.entries(evidence).map(([key, quote]) => <div key={key}><dt>{key}</dt><dd>{quote}</dd></div>)}</dl></details>}
    {!image?.dataUrl && !text?.trim() && <p>No source supplied.</p>}
  </aside>
}
