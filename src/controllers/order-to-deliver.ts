import date from 'date-and-time'

import { getProductWithSummaries } from '../helpers/get-product-with-summaries'
import { getWarehouses } from '../helpers/get-warehouses'
import { getLastSalesSummaries } from '../helpers/get-last-sales-summaries'
import { getWmsStockList } from '../helpers/get-wms-stock-list'
import { getEmptySlotList } from '../helpers/get-wms-empty-slots'

import { getProductListByCategory, getSearchFilteredList, isEmptyObject, isEmptyString } from '../utils/app'

export const getAllOrderToDeliverList = async (req: any, res: any) => {
  const {
    category_l,
    category_m,
    category_s,
    stock_owner_id,
    search
  } = req.query

  let RESULT_DATA = []

  const stockOwnerId = stock_owner_id === undefined ? 1 : parseInt(stock_owner_id)

  const productWithSummariesList = await getProductWithSummaries()
  if (productWithSummariesList === null) return res.status(400).json({ message: 'Cannot find Product Details. Please try again later !!!' })

  try {
    const warehouseList = await getWarehouses()
    const lastSalesSummariesList = await getLastSalesSummaries()
    const wmsStockList = await getWmsStockList()
    const emptySlotObject = await getEmptySlotList()

    const emptySlotNumber = isEmptyObject(emptySlotObject) ? 0 : emptySlotObject.bi_total_low_empty + emptySlotObject.tri_total_hi_empty + emptySlotObject.tri_total_low_empty

    const filteredProductWithSummariesList = getProductListByCategory(productWithSummariesList, category_l, category_m, category_s)
    const filteredListAfterSearch = isEmptyString(search) ? filteredProductWithSummariesList : getSearchFilteredList(filteredProductWithSummariesList, search)
    for (let index=0; index<lastSalesSummariesList.length; index++) {
      const item = lastSalesSummariesList[index]
      const availableSlots = wmsStockList.reduce((total: any, wmsStock: any) => (wmsStock.product_code === item.product_code ? total+1 : total), 0)
      // const wmsStockDetails = wmsStockList.find((wmsStock: any) => wmsStock.product_code === item.product_code)

      const productInformation = filteredListAfterSearch.find((product: any) => product.id === item.product_id)
      const warehouseInfo = warehouseList.result.find((warehouse: any) => warehouse.id === item.warehouse_id)

      if (productInformation === null || productInformation === undefined) continue
      
      let unsoldPeriod: any = ''
      if (item.last_move_date !== null) {
        const formattedLastSoldDate: any = new Date(date.format(new Date(item.last_move_date), 'MM-DD-YYYY'))
        const currentDate: any = new Date(date.format(new Date(), 'MM-DD-YYYY'))
        unsoldPeriod = Math.floor((currentDate - formattedLastSoldDate) / (1000 * 60 * 60 * 24))
      }

      const productDetails = {
        primary_category: !isEmptyObject(productInformation.product_category_l) && productInformation.product_category_l.name,
        secondary_category: !isEmptyObject(productInformation.product_category_m) && productInformation.product_category_m.name,
        tertiary_category: !isEmptyObject(productInformation.product_category_s) && productInformation.product_category_s.name,
        product_name: productInformation.product_name,
        product_id: productInformation.id,
        product_code: productInformation.product_code,
        jan_code: productInformation.local_code,
        product_image: productInformation.image_url,
        stock_quantity: item.total_quantity,
        last_delivery_date: item.last_arrival_date,
        last_delivery_quantity: item.last_arrival_quantity,
        last_sold_date: item.last_move_date,
        last_sold_quantity: item.last_move_quantity,
        not_sold_period: unsoldPeriod,
        selling_price_with_tax: parseFloat(productInformation.value_price_with_tax).toFixed(2),
        warehouse_name: warehouseInfo === undefined ? '' : warehouseInfo.name,
        available_slot: availableSlots
      }

      RESULT_DATA.push(productDetails)
    }

    res.status(200).json({ data: 
      {
        total_count: RESULT_DATA.length,
        results: RESULT_DATA,
        empty_slots_number: emptySlotNumber
      }
    })
  } catch (error) {
    console.log('error=', error)
    res.status(500).json({ message: `${error}, API Error !!!` })
  }
}