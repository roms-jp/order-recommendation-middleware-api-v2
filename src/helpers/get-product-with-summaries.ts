import axios from 'axios'

import { coreApiConfig } from '../configs/api-header-config'

export const getProductWithSummaries = async () => {
  try {
    const list = await axios.get(
      `${coreApiConfig.baseUrl}/api/core/1.0/product_with_summaries`,
      { headers: coreApiConfig.headerConfig }
      )
    return list.data.result
  } catch(error) {
    return null
  }
}