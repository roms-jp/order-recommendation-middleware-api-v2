import axios from 'axios'

import { coreApiConfig } from '../configs/api-header-config'

export const getAllStockHistories = async () => {
  try {
    const listById = await axios.get(
      `${coreApiConfig.baseUrl}/api/core/1.0/stock_histories`,
      { headers: coreApiConfig.headerConfig }
    )
    return listById.data.result
  } catch (error) {
    return []
  }
}