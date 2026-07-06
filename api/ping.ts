export default function handler() {
  return new Response(JSON.stringify({ pong: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
