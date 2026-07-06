export default function handler() {
  return new Response(JSON.stringify({ mjs: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
