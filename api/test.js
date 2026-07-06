export default function handler() {
  return new Response(JSON.stringify({ js: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
