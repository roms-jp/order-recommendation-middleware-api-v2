// @ts-ignore
const pgp = require('pg-promise')()
// import { Client } from 'pg'

export const getRedshiftConnection = async () => {
  const dbUser = 'admin'
  const dbPassword = 'mh27nNpAAFXK9gL2xkGs'
  const dbHost = 'analytics-dwh.c2zfbsmnev6e.ap-northeast-1.redshift.amazonaws.com'
  const dbPort = '5439'
  const dbName = 'dev'

  const connectionString = `postgres://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}?ssl=true`
  const connectionToDB = pgp(connectionString)
  return connectionToDB
}

export const closeConnection = async () => pgp.end()

// export const connectToRedshift = async () => {
//   try {
//     const client = new Client({
//       host: 'analytics-dwh.c2zfbsmnev6e.ap-northeast-1.redshift.amazonaws.com',
//       port: 5439,
//       user: 'admin',
//       password: 'mh27nNpAAFXK9gL2xkGs',
//       database: 'dev',
//       ssl: true
//     })
//     client.connect()
//     return client
//   } catch (error) {
//     return null
//   }
// }