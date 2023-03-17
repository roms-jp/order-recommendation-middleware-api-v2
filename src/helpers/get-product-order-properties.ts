import axios from 'axios'
import { invOptApiConfig } from '../configs/api-header-config'

export const getProductOrderPropertiesList = async (stockOwnerId = 1) => {
  try {
    const orderPropertyList = await axios.get(
      `${invOptApiConfig.baseUrl}/api/invopt/1.0/product_order_properties?search=stock_owner_id=${stockOwnerId}`,
      {
        headers: invOptApiConfig.headerConfig
      }
    )
    return orderPropertyList.data.result
  } catch (error) {
    return null
  }
}