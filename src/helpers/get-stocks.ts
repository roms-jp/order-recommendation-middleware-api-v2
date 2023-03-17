import axios from 'axios'
import { coreApiConfig } from '../configs/api-header-config'

export const getStockList = async () => {
  try {
    const stocksList = await axios.get(
      `${coreApiConfig.baseUrl}/api/core/1.0/stocks`,
      { headers: coreApiConfig.headerConfig }
    )
    return stocksList.data.result
  } catch(error) {
    return null
  }
}