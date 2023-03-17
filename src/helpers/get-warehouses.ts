import axios from 'axios'
import { coreApiConfig } from '../configs/api-header-config'

export const getWarehouses = async () => {
  try {
    const list = await axios.get(
      `${coreApiConfig.baseUrl}/api/core/1.0/warehouses`,
      { headers: coreApiConfig.headerConfig }
    )
    return list.data
  } catch(error) {
    return []
  }
}