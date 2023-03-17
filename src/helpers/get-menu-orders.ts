import axios from 'axios'

import { coreApiConfig } from '../configs/api-header-config'

export const getMenuOrders = async () => {
  try {
    const list = await axios.get(
      `${coreApiConfig.baseUrl}/api/core/1.0/orders?search=commerce_id=1`,
      { headers: coreApiConfig.headerConfig }
      )
    return list.data.result
  } catch(error) {
    return []
  }
}