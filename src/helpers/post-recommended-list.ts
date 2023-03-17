import axios from 'axios'
import { invOptApiConfig } from '../configs/api-header-config'

export const postRecommendedList = async (data: any) => {
  try {
    const apiResponse = await axios.post(
      `${invOptApiConfig.baseUrl}/api/invopt/1.0/product_order_histories`,
      data,
      { headers: invOptApiConfig.headerConfig }
    )
    return apiResponse
  } catch(error: any) {
    console.log('Error while saving recommended list', error.toString())
  }
  
}