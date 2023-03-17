import axios from 'axios'
import { wmsApiConfig } from '../configs/api-header-config'

export const getWmsStockList = async () => {
  try {
    const list = await axios.get(
      `${wmsApiConfig.baseUrl}/api/2.0/stock:list`,
      { headers: wmsApiConfig.headerConfig }
    )
    return list.data.slots
  } catch(error) {
    return []
  }
}