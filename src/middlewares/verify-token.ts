import { Request } from 'express'
import axios from 'axios'
import jwt from 'jsonwebtoken'
import jwkToPem from 'jwk-to-pem'

export const verifyToken = async (req:any, res:any, next:any) => {
  const token = readAccessToken(req)
  if (!token) return res.status(401).send("Authorization Failed!!!")

  const jwksUrl = `https://cognito-idp.${process.env.REGION}.amazonaws.com/${process.env.USER_POOL_ID}/.well-known/jwks.json`

  try {
    const data = await axios.get(jwksUrl)
    const pem = jwkToPem(data.data.keys[0])
    jwt.verify(token, pem, { algorithms: ['RS256'] }, function(error, decodedToken) {
      if (error) return res.status(401).send("Authorization Failed. Invalid Token!!!")
      return next()
    })
  } catch (error) {
    return res.status(401).send("Authorization Failed. Try Again!!!")
  }
}

const readAccessToken = (request: Request): string | null => {
  const authorizationHeader = request.header('authorization')
  if (authorizationHeader) {
    const parts = authorizationHeader.split(' ')
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') return parts[1]
  }
  return null
}