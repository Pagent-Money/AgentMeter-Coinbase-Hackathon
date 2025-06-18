/* global __webpack_hash__ */

import path from 'path'
import Express from 'express'
import { paymentMiddleware } from 'x402-express'
import cors from 'cors'

const port = 4021
const app = new Express()
const payTo = '0x08Cd4C79fd197640c004e5aEd98Bb0b3a121bEe5'

// Enable CORS for all routes
app.use(cors())

app.use(
  paymentMiddleware(
    payTo,
    {
      'GET /chat': {
        price: '$0.001',
        network: 'base-sepolia'
      }
    },
    {
      url: 'https://x402.org/facilitator'
    }
  )
)

app.get('/chat', (req, res) => {
  res.send({
    report: {
      chat: 'sunny',
      temperature: 70
    }
  })
})

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`)
})
