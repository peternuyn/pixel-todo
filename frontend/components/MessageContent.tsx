// Renders a chat message's text, turning URLs into rich content:
//   - an image URL (ends in .png/.jpg/.jpeg/.gif/.webp/.svg) -> inline <img>
//   - any other URL                                          -> clickable <a>
//   - everything else                                        -> plain text
// This single component covers both the "insert images" and "insert links"
// features: the message is stored as plain text on the backend, and the special
// rendering happens entirely here on the frontend.

// Matches http(s) URLs. The capturing group means String.split keeps the URLs as
// their own pieces in the resulting array (so we can inspect each one).
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

// True for URLs that point at an image we can safely drop into an <img>. We strip
// any ?query/#hash before checking the extension.
function isImageUrl(url: string): boolean {
  const withoutQuery = url.split(/[?#]/)[0];
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(withoutQuery);
}

export default function MessageContent({ content }: { content: string }) {
  // Split on URLs, keeping them. Filter out the empty strings split can produce.
  const parts = content.split(URL_REGEX).filter((p) => p.length > 0);

  return (
    <span className="break-words whitespace-pre-wrap">
      {parts.map((part, i) => {
        if (!URL_REGEX.test(part)) {
          // Plain text. (URL_REGEX has the global flag, so reset lastIndex first
          // to avoid the stateful-regex gotcha on repeated .test calls.)
          URL_REGEX.lastIndex = 0;
          return <span key={i}>{part}</span>;
        }
        URL_REGEX.lastIndex = 0;

        if (isImageUrl(part)) {
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={part}
              alt="shared"
              className="mt-1 block max-h-48 max-w-full rounded-lg border-[3px] border-panel-stroke"
            />
          );
        }

        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-wood-dark underline underline-offset-2 hover:text-barn break-all"
          >
            {part}
          </a>
        );
      })}
    </span>
  );
}
