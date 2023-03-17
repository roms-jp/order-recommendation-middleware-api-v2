import bodyParser from 'body-parser'
import cors from 'cors'
import express from 'express'

import { appRouter } from './src/routes'
import { getCORSOptionsConfig } from './src/configs/app'

const app = express()

const appPort = process.env.APP_PORT || 8080

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.use(cors(getCORSOptionsConfig()))

app.get('/health-check', (req, res) => {
  res.status(200).send('OK');
})

app.use('/', appRouter)

const startApp = async () => {
  try {
    app.listen(appPort, () => {
      console.log(`Server is listening and Running in port: ${appPort}`)
    })
  } catch(error) {
    console.log('Error Starting App:', error)
  }
}

startApp()