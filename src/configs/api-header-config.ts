import dotenv from 'dotenv'

dotenv.config()

export const coreApiConfig = {
  headerConfig: {
    'content-type': 'application/json',
    'authorization': process.env.CORE_API_AUTHORIZATION as string,
    'x-api-key': process.env.CORE_API_KEY as string
  },
  baseUrl: process.env.CORE_API_BASE_URL
}

export const invOptApiConfig = {
  headerConfig: {
    'content-type': 'application/json',
    'authorization': process.env.INV_API_AUTHORIZATION as string,
    'x-api-key': process.env.INV_API_KEY as string
  },
  baseUrl: process.env.INV_API_BASE_URL
}

export const wmsApiConfig = {
  headerConfig: {
    'content-type': 'application/json',
    'authorization': process.env.WMS_API_AUTHORIZATION as string,
  },
  baseUrl: process.env.WMS_API_BASE_URL
}