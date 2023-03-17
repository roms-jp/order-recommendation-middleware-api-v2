import axios from 'axios'
import { invOptApiConfig }  from '../configs/api-header-config'

export const getProductSupplyPropertiesList = async () => {
  try {
    const list = await axios.get(
      `${invOptApiConfig.baseUrl}/api/invopt/1.0/product_supply_properties`,
      {
        headers: invOptApiConfig.headerConfig
      }
    )
    return list.data.result
  } catch (error) {
    return []
  }
}