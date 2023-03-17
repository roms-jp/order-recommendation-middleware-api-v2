import axios from 'axios'
import { invOptApiConfig } from '../configs/api-header-config'

export const updateRecommendedList = async (data: any, productOrderPropertyId: string) => {
  try {
    const apiResponse = await axios.patch(
      `${invOptApiConfig.baseUrl}/api/invopt/1.0/product_order_properties/${productOrderPropertyId}`,
      data,
      { headers: invOptApiConfig.headerConfig }
    )
    return apiResponse
  } catch(error: any){
    console.log('Updating Recommended List error:', error.toString())
  }
}