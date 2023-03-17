import axios from 'axios'
import { invOptApiConfig } from '../configs/api-header-config'

export const getProductOrderHistories = async () => {
  try {
    const list = await axios.get(
      `${invOptApiConfig.baseUrl}/api/invopt/1.0/product_order_histories`,
      {
        headers: invOptApiConfig.headerConfig
      }
    )
    return list.data.result
  } catch (error) {
    return null
  }
}