import mysql from 'mysql2'

import { getDeliveryCycleFromId, getOrderDeliveryCyclesList } from '../utils/order-attributes'
import { getProductOrderPropertiesList } from '../helpers/get-product-order-properties'
import { getProductWithSummaries } from '../helpers/get-product-with-summaries'
import { getStockList } from '../helpers/get-stocks'
import { getAllSalesHistories } from '../helpers/get-sales-history-details'
import { getAllStockHistories } from '../helpers/get-stock-histories'
import { updateRecommendedList } from '../helpers/post-order-attributes-list'
import { getLast15DaysOrders } from '../helpers/get-last-15-days-orders'

import { OrderAttributesRequest } from '../types/order-attributes'

import {
  getProductListByCategory,
  getSearchFilteredList,
  getHistorySalesHistoriesByStockId,
  isEmptyObject,
  isEmptyString,
  isPositiveInteger
} from '../utils/app'

export const getOrderAttributesList = async (req: OrderAttributesRequest, res: any) => {
  const {
    category_l,
    category_m,
    category_s,
    stock_owner_id,
    search
  } = req.query

  const RESULT_LIST = []
  const stockOwnerId = stock_owner_id === undefined ? 1 : parseInt(stock_owner_id)

  const productWithSummariesList = await getProductWithSummaries()
  if (productWithSummariesList === null || productWithSummariesList.length === 0 ) return res.status(400).json({ message: 'Cannot find Product Details. Please try again later !!!' })

  const productOrderPropertiesList = await getProductOrderPropertiesList(stockOwnerId)
  if (productOrderPropertiesList === null || productOrderPropertiesList.length === 0) return res.status(400).json({ message: 'Cannot find Product Order Properties. Please try again later !!!' })

  try {
    const orderDeliveryCyclesList: any = await getOrderDeliveryCyclesList()
    const stockList = await getStockList()

    const coreConnection = mysql.createConnection({
      host: process.env.CORE_DB_HOST,
      user: process.env.CORE_DB_USER,
      password: process.env.CORE_DB_PASSWORD,
      database: process.env.CORE_DB_DATABASE
    })

    const allSalesHistoriesList = await getAllSalesHistories(coreConnection)
    const allStockHistoriesList = await getAllStockHistories()

    const allOrderList = await getLast15DaysOrders(coreConnection)
    const allCanceledOrderList = allOrderList.filter((item: any) => item.order_cancel_flg === 1)
    const allSuccessfulOrderList = allOrderList.filter((item: any) => item.order_cancel_flg === 0)

    const filteredProductWithSummariesList = getProductListByCategory(productWithSummariesList, category_l, category_m, category_s)
    const filteredListAfterSearch = isEmptyString(search) ? filteredProductWithSummariesList : getSearchFilteredList(filteredProductWithSummariesList, search)

    for (const item of productOrderPropertiesList) {
      const stockInformation = stockList === null ? undefined : stockList.find((stock: any) => stock.product_id === item.product_id)
      const deliveryCycleList = getDeliveryCycleFromId(orderDeliveryCyclesList, item.id)

      const productInformation = filteredListAfterSearch.find((product: any) => product.id === item.product_id)
      if (productInformation === null || productInformation === undefined) continue

      const salesHistoryByStockId = allSalesHistoriesList.filter((item: any) => item.stock_id === stockInformation.id)
      const stockHistoriesListByStockId = allStockHistoriesList.filter((item: any) => item.stock_id === stockInformation.id)
      const canceledOrderById = allCanceledOrderList.filter((item: any) => parseInt(item.product_id) === parseInt(productInformation.id))
      const successfulOrderById = allSuccessfulOrderList.filter((item: any) => parseInt(item.product_id) === parseInt(productInformation.id))
      const historySalesList = getHistorySalesHistoriesByStockId(salesHistoryByStockId, stockHistoriesListByStockId, successfulOrderById, canceledOrderById)

      let averageSalesForWeek: any = 0
      if (historySalesList.length > 0) {
        const listForAverage = historySalesList.slice(-8, -1) //last 7 days
        averageSalesForWeek = Math.ceil(listForAverage.reduce((accumulator: any, object: any) => {
          return accumulator + Math.abs(object.sales)
        }, 0) / 7)
      }

      const productDetails = {
        stock_owner_id: productInformation.stock_summaries[0].stock_owner_id,
        primary_category: !isEmptyObject(productInformation.product_category_l) ? productInformation.product_category_l.name : '',
        secondary_category: !isEmptyObject(productInformation.product_category_m) ? productInformation.product_category_m.name : '',
        tertiary_category: !isEmptyObject(productInformation.product_category_s) ? productInformation.product_category_s.name : '',
        product_code: productInformation.product_code,
        product_id: productInformation.id,
        jan_code: productInformation.local_code,
        product_image: productInformation.image_url,
        product_name: productInformation.product_name,
        selling_price_with_tax: parseFloat(productInformation.value_price_with_tax).toFixed(2),
        price_without_tax: parseFloat(productInformation.value_price_without_tax).toFixed(2),
        delivery_cycles: deliveryCycleList,
        history_sales_list: historySalesList,
        safety_stock_days: item.safty_stock_day,
        average_sales_volume: averageSalesForWeek,
        order_property_id: item.id
      }
      RESULT_LIST.push(productDetails)
    }
    const finalResult = {
      total_count: RESULT_LIST.length,
      results: RESULT_LIST
    }
    res.status(200).json({ data: finalResult })
  } catch(error: any) {
    res.status(400).json({ message: `${error.toString()}. Server Error. Please try again later !!!` })
  }
}

export const postOrderAttributesList = async (req: any, res: any) => {
  const successIdList = []
  const failedIdList = []
  const RESPONSE_LIST = []
  const data = req.body
  const itemsWithPropertyIds = [...data]
  const orderPropertyList = itemsWithPropertyIds.map(obj => obj.order_property_id)
  data.forEach((object: any) => delete object['order_property_id'])

  for (let index=0; index<data.length; index++) {
    if (!isPositiveInteger(data[index].safty_stock_day)) {
      failedIdList.push(data[index].product_id)
    } else {
      try {
        setTimeout( async () => {
          await updateRecommendedList(data[index], orderPropertyList[index])
        }, 100)
        successIdList.push(data[index].product_id)
      } catch (error) {
        console.log('error=', error)
      }
    }
  }
  if (failedIdList.length > 0) {
    RESPONSE_LIST.push({
      status: 'Failed',
      message: 'Please enter valid value for Safety stock days',
      id_list: failedIdList
    })
  }

  if (successIdList.length > 0) {
    RESPONSE_LIST.push({
      status: 'Success',
      message: 'Successfully Updated Products.',
      id: successIdList
    })
  }
  res.status(200).json({ response: RESPONSE_LIST })
}