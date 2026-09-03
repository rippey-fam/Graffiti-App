import express from 'express'

const app = express()
const port = 3000

app.use(express.json())

app.get('/api/health', (_request, response) => {
  response.json({ ok: true })
})

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`)
})