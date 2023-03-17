import axios from 'axios'
import { coreApiConfig } from '../configs/api-header-config'

export const getLastSalesSummaries = async () => {
  try {
    const list = await axios.get(
      `${coreApiConfig.baseUrl}/api/core/1.0/stocks/last_sale_summaries?q=&search=total_quantity>0`,
      { headers: coreApiConfig.headerConfig }
    )
    return list.data.result
  } catch(error: any) {
    console.log('Error in getting last sales summaries',error.toString())
    return []
  }
}