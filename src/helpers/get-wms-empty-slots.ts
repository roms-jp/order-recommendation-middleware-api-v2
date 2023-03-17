import axios from 'axios'
import { wmsApiConfig } from '../configs/api-header-config'

export const getEmptySlotList = async () => {
  try {
    const list = await axios.get(
      `${wmsApiConfig.baseUrl}/api/internal/tote:empty-slot-list`,
      { headers: wmsApiConfig.headerConfig }
    )
    return list.data
  } catch(error) {
    return {}
  }
}