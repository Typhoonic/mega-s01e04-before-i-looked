import type { NightDigest } from '../digest/types.js';

export function DigestView({ digest }: { digest: NightDigest }) {
  if (digest.rows.length === 0) {
    return (
      <>
        <h1>digest · {digest.night}</h1>
        <p class="mute">nothing ran</p>
      </>
    );
  }

  return (
    <>
      <h1>digest · {digest.night}</h1>
      <table>
        <thead>
          <tr>
            <th>job</th>
            <th>owner</th>
            <th>runs</th>
            <th>retries</th>
            <th>status</th>
            <th>last error</th>
            <th>first</th>
            <th>last</th>
          </tr>
        </thead>
        <tbody>
          {digest.rows.map((row) => (
            <tr key={row.job}>
              <td>{row.job}</td>
              <td>{row.owner}</td>
              <td>{row.runs}</td>
              <td>
                {row.retries >= 3 ? (
                  <span class="warn">{row.retries}</span>
                ) : (
                  row.retries
                )}
              </td>
              <td>
                {row.lastStatus === 'fail' ? (
                  <span class="warn">{row.lastStatus}</span>
                ) : (
                  row.lastStatus
                )}
              </td>
              <td>{row.lastError ? row.lastError : '—'}</td>
              <td>{row.firstTime}</td>
              <td>{row.lastTime}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
