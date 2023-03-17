// @ts-nocheck
import date from 'date-and-time'
import e, { Response } from 'express'
import mysql from 'mysql2'
import axios from 'axios'

import {
  getSearchFilteredList,
  isEmptyArray,
  isEmptyString,
  isEmptyObject,
  isPositiveInteger,
  getHistorySalesHistoriesByStockId
} from '../utils/app'
import {
  formatProductListForUI,
  getAllDeliveryCycles,
  getForecastList,
  getFutureSalesList,
  getOrderAndDeliveryDates,
  getPredictedStandardStockDetails,
  getProductHistoryByIdAndDateFromList,
  getProductListByCategory,
  getProductLotDetails,
  getSortedResult
} from '../utils/recommended-orders'

import { getProductOrderHistories } from '../helpers/get-product-order-histories'
import { getProductOrderPropertiesList } from '../helpers/get-product-order-properties'
import { getProductSupplyPropertiesList } from '../helpers/get-product-supply-properties'
import { getProductWithSummaries } from '../helpers/get-product-with-summaries'
import { getAllSalesHistories } from '../helpers/get-sales-history-details'
import { getAllStockHistories } from '../helpers/get-stock-histories'
import { getStockList } from '../helpers/get-stocks'
import { getLast15DaysOrders } from '../helpers/get-last-15-days-orders'
// import { getPreviousDayStockQuantityByProductId } from '../helpers/get-previous-day-stock'
import { postRecommendedList } from '../helpers/post-recommended-list' 

import { OrderRecommendationRequest } from '../types/recommended-order'

export const getRecommendedOrderList = async (req: OrderRecommendationRequest, res: Response) => {
  const {
    stock_owner_id,
    category_l,
    category_m,
    category_s,
    below_order_point,
    search
  } = req.query

  let FINAL_DATA = {
    total_count: 0,
    results: [],
    ordered_list: <any>[],
    temp_order_list: <any>[]
  }

  let ORDERED_LIST = <any>[]
  let RESULT_LIST = <any>[]

  const queryDate = date.format(new Date(), 'YYYY-MM-DD').toString()
  const stockOwnerId = stock_owner_id === undefined ? 1 : parseInt(stock_owner_id)
  const belowOrderPoint = below_order_point === undefined || below_order_point.toLowerCase() === 'true'

  const productWithSummariesList = await getProductWithSummaries()
  if (productWithSummariesList === null) return res.status(400).json({ message: 'Cannot find Product Details. Please try again later !!!' })

  const productOrderPropertiesList = await getProductOrderPropertiesList(stockOwnerId)
  if (productOrderPropertiesList === null) return res.status(400).json({ message: 'Cannot find Product Order Properties. Please try again later !!!' })
  let invtConnection: any = null
  let coreConnection: any = null

  // let previousDayDate = date.format(date.addDays(new Date(queryDate), -1), 'YYYY-MM-DD').toString()
  // const previousDayStockList = await getPreviousDayStockQuantityByProductId(previousDayDate + ' 23:59:59')

  try {
    const productOrderHistoriesList = await getProductOrderHistories()
    const productSupplyPropertiesList = await getProductSupplyPropertiesList()
    const filteredProductWithSummariesList = getProductListByCategory(productWithSummariesList, category_l, category_m, category_s)
    const filteredListAfterSearch = isEmptyString(search) ? filteredProductWithSummariesList : getSearchFilteredList(filteredProductWithSummariesList, search)

    invtConnection = mysql.createConnection({
      host: process.env.INVT_DB_HOST,
      user: process.env.INVT_DB_USER,
      password: process.env.INVT_DB_PASSWORD,
      database: process.env.INVT_DB_DATABASE
    })

    coreConnection = mysql.createConnection({
      host: process.env.CORE_DB_HOST,
      user: process.env.CORE_DB_USER,
      password: process.env.CORE_DB_PASSWORD,
      database: process.env.CORE_DB_DATABASE
    })

    const allDeliveryCycles = await getAllDeliveryCycles(invtConnection)
    const stockList = await getStockList()

    const allSalesHistoriesList = await getAllSalesHistories(coreConnection)
    const allStockHistoriesList = await getAllStockHistories()

    const allOrderList = await getLast15DaysOrders(coreConnection)
    const allCanceledOrderList = allOrderList.filter((item: any) => item.order_cancel_flg === 1)
    const allSuccessfulOrderList = allOrderList.filter((item: any) => item.order_cancel_flg === 0)
    
    for (const item of productOrderPropertiesList) {
      const productInformation = filteredListAfterSearch.find((product:any) => product.id === item.product_id)
      if (productInformation === null || productInformation === undefined) continue
      
      const currentStock = productInformation.stock_summaries[0].total_available_quantity
      
      // const previousStockDetailsById = previousDayStockList.find((product:any) => parseInt(product.product_id) === parseInt(item.product_id))
      // const previousDayStockQuantity = previousStockDetailsById === undefined ? 0 : previousStockDetailsById.total_quantity

      const forecastList = await getForecastList(invtConnection, item.product_id, queryDate)

      const orderDeliveryDetails = await getOrderAndDeliveryDates(allDeliveryCycles, item.product_id, queryDate)
      const nextOrderDate = orderDeliveryDetails.nextOrderDate
      const nextDeliveryDate = orderDeliveryDetails.nextDeliveryDate
      const nextNextDeliveryDate = orderDeliveryDetails.nextNextDeliveryDate

      const stockDetails = stockList.find((stock: any) => stock.product_id === item.product_id)

      const salesHistoryByStockId = allSalesHistoriesList.filter((item: any) => item.stock_id === stockDetails.id)
      const canceledOrderById = allCanceledOrderList.filter((item: any) => parseInt(item.product_id) === parseInt(productInformation.id))
      const successfulOrderById = allSuccessfulOrderList.filter((item: any) => parseInt(item.product_id) === parseInt(productInformation.id))
      const stockHistoriesListByStockId = allStockHistoriesList.filter((item: any) => item.stock_id === stockDetails.id)

      let historySalesList = getHistorySalesHistoriesByStockId(salesHistoryByStockId, stockHistoriesListByStockId, successfulOrderById, canceledOrderById)
      
      let averageSalesForWeek: any = 0
      if (historySalesList.length > 0) {
        const listForAverage = historySalesList.slice(-8, -1) //last 7 days
        averageSalesForWeek = Math.ceil(listForAverage.reduce((accumulator: any, object: any) => {
          return accumulator + Math.abs(object.sales)
        }, 0) / 7)
      }

      const safetyStockQuantity = item.safty_stock_day * averageSalesForWeek

      const previousDayStock = historySalesList.length > 2 ? historySalesList[historySalesList.length-2].stock_amt : 0
      const predictedStandardStockDetails = getPredictedStandardStockDetails(
                                            forecastList,
                                            productOrderHistoriesList,
                                            item.product_id,
                                            previousDayStock,
                                            // previousDayStockQuantity,
                                            // currentStock,
                                            safetyStockQuantity,
                                            // item.safty_stock_quantity,
                                            queryDate,
                                            nextDeliveryDate,
                                            nextNextDeliveryDate
                                          )
      if (belowOrderPoint && predictedStandardStockDetails.necessaryQuantity <= 0 && isEmptyString(search)) continue // skip the loop

      const futureSales = await getFutureSalesList(
        forecastList,
        historySalesList,
        item.product_id,
        // currentStock,
        // previousDayStockQuantity,
        previousDayStock,
        productInformation.stock_summaries[0]?.summaries
      )

      const noHistorySalesList = []
      if (historySalesList.length === 0) {
        let historyDate: any = date.format(new Date(), 'YYYY/MM/DD')
        for (let i=0; i<15; i++) {
          noHistorySalesList.push(
            {
              date: historyDate.slice(5, 10),
              sales: 0,
              canceled_sales: 0,
              disposal: 0,
              delivery_history: 0,
              delivery: [],
              stock_amt: 0
            }
          )
          historyDate = date.format(date.addDays(new Date(historyDate), -1), 'YYYY/MM/DD')
        }
        noHistorySalesList.sort((p1:any, p2:any) => (p2.date < p1.date) ? 1 : (p2.date > p1.date) ? -1 : 0)
        historySalesList = noHistorySalesList
      }

      if (futureSales.length > 0) historySalesList.pop()
      const stockPrediction = historySalesList.concat(futureSales)

      const lotDetails = productSupplyPropertiesList !== null ? getProductLotDetails(productSupplyPropertiesList, item.id, predictedStandardStockDetails.necessaryQuantity) : ''
      
      const productDetails = {
        product_id: productInformation.id,
        stock_owner_id: !isEmptyArray(productInformation.stock_summaries) ? productInformation.stock_summaries[0].stock_owner_id : 1,
        primary_category: !isEmptyObject(productInformation.product_category_l) ? productInformation.product_category_l.name : '',
        secondary_category: !isEmptyObject(productInformation.product_category_m) ? productInformation.product_category_m.name : '',
        tertiary_category: !isEmptyObject(productInformation.product_category_s) ? productInformation.product_category_s.name : '',
        product_code: productInformation.product_code,
        jan_code: productInformation.local_code,
        product_image: productInformation.image_url,
        product_name: productInformation.product_name,
        selling_price_with_tax: parseFloat(productInformation.value_price_with_tax).toFixed(2),
        next_order_date: nextOrderDate,
        next_delivery_date: nextDeliveryDate,
        next_next_delivery_date: nextNextDeliveryDate,
        current_stock: currentStock,
        predicted_stock_at_delivery_time: predictedStandardStockDetails.predictedStock,
        standard_stock_at_delivery_time: predictedStandardStockDetails.standardStock,
        stock_prediction: stockPrediction,
        necessary_quantity: predictedStandardStockDetails.necessaryQuantity,
        order_recommendation_lot: lotDetails
      }
      RESULT_LIST.push(productDetails)

      const productWithHistory = getProductHistoryByIdAndDateFromList(productOrderHistoriesList, item.product_id, queryDate)
      if (!isEmptyObject(productWithHistory)) ORDERED_LIST.push(productWithHistory.data)
    }
    const finalDataList = getSortedResult(RESULT_LIST, ORDERED_LIST)
    FINAL_DATA.results = finalDataList
    FINAL_DATA.total_count = finalDataList.length
    FINAL_DATA.ordered_list = ORDERED_LIST
    FINAL_DATA.temp_order_list = formatProductListForUI(FINAL_DATA.results)
  }catch (error: any) {
    invtConnection.end()
    coreConnection.end()
    return res.status(400).json({ message: `Cannot get list. Please try again later. ${error.toString()}` })
  }
  invtConnection.end()
  coreConnection.end()
  res.status(200).json({ data: FINAL_DATA })
}

export const postOrderRecommendationList = async (req: any, res: any) => {
  let RESPONSE_LIST = []
  const data = req.body
  
  for (let index=0; index<data.length; index++) {
    if (!isPositiveInteger(data[index].schedule_arrival_quantity)) {
      RESPONSE_LIST.push({
        status: 'Failed',
        message: 'Please enter valid value for Quantity',
        id: data[index].product_id
      })
    } else {
      try {
        setTimeout( async () => {
          await postRecommendedList(data[index])
        }, 100)

        RESPONSE_LIST.push({
          status: 'Success',
          message: 'Successfully Saved',
          id: data[index].product_id
        })
      } catch (error: any) {
        console.log('error=', error.toString)
      }
    }
  }
  res.status(200).json({ response: RESPONSE_LIST })
}

export const syncDataWithGateway = async(req: any, res: any) => {
  const INVT_DB_HOST='mariadb-develop-gateway-core.czf3hh8mjnuy.ap-northeast-1.rds.amazonaws.com'
  const INVT_DB_USER='invopt_admin'
  const INVT_DB_PASSWORD='kWf7r5yZGKBrUnUrv6d3dFPsBxKVGkxTMHfiqG4vkVcXrWqi6YLs2R2wqwLEKxiw'
  const INVT_DB_DATABASE='invopt'

  const productWithSummariesList = await getProductWithSummaries()
  if (productWithSummariesList === null) return res.status(400).json({ message: 'Cannot find Product Details. Please try again later !!!' })
  
  const productWithSummariesWithoutTestProducts = productWithSummariesList.filter((product: any) => !product.product_code.includes('test'))
  try {
    const invtConnection = mysql.createConnection({
      host: INVT_DB_HOST,
      user: INVT_DB_USER,
      password: INVT_DB_PASSWORD,
      database: INVT_DB_DATABASE
    })

    const productPropertiesList = await getProductOrderPropertiesList()
    const productSupplyPropertiesList = await getProductSupplyPropertiesList()
    const productPropertiesListToSave: any = []
    const productSupplyListToSave: any = []
    for (let i=0; i<productWithSummariesWithoutTestProducts.length; i++) {
      const singleProductWithoutTest = productWithSummariesWithoutTestProducts[i]
      const productPropertiesToSave: any = {}
      const productSupplyPropertiesToSave: any = {}
      if (productPropertiesList.length > 0 ) {
        const product = productPropertiesList.find((item: any) => item.product_id === singleProductWithoutTest.id)
        if (product === undefined) {
          productPropertiesToSave.stock_owner_id = 1
          productPropertiesToSave.product_id = singleProductWithoutTest.id
          productPropertiesToSave.ordering_point = 1
          productPropertiesToSave.safty_stock_quantity = 10
          productPropertiesToSave.sales_quantity_per_day = 5
          productPropertiesToSave.safty_stock_day = 2
          productPropertiesToSave.safty_stock_day_update_date = '2022-11-01 00:00:00'
          productPropertiesToSave.props = 1
        }
      } else {
        productPropertiesToSave.stock_owner_id = 1
        productPropertiesToSave.product_id = singleProductWithoutTest.id
        productPropertiesToSave.ordering_point = 1
        productPropertiesToSave.safty_stock_quantity = 10
        productPropertiesToSave.sales_quantity_per_day = 5
        productPropertiesToSave.safty_stock_day = 2
        productPropertiesToSave.safty_stock_day_update_date = '2022-11-01 00:00:00'
        productPropertiesToSave.props = 1
      }
      if (JSON.stringify(productPropertiesToSave) !== '{}') productPropertiesListToSave.push(productPropertiesToSave)



      //product supply properties
      if (productSupplyPropertiesList.length > 0) {
        const product = productSupplyPropertiesList.find((item: any) => item.product_id === singleProductWithoutTest.id)
        if (product === undefined) {
          productSupplyPropertiesToSave.product_id = singleProductWithoutTest.id
          productSupplyPropertiesToSave.quantity_per_case = 1
          productSupplyPropertiesToSave.min_ordering_unit = 1
        }
      } else {
        productSupplyPropertiesToSave.product_id = singleProductWithoutTest.id
        productSupplyPropertiesToSave.quantity_per_case = 1
        productSupplyPropertiesToSave.min_ordering_unit = 1
      }
      if (JSON.stringify(productSupplyPropertiesToSave) !== '{}') productSupplyListToSave.push(productSupplyPropertiesToSave)
    }

    // saving productOrderProperties
    for (let index=0; index<productPropertiesListToSave.length; index++) {
      setTimeout( async () => {
        await postSyncProductOrderProperties(productPropertiesListToSave[index])
      }, 100)
    }

    //saving productSupplyProperties
    for (let index=0; index<productSupplyListToSave.length; index++) {
      setTimeout( async () => {
        await postSyncProductSupplyProperties(productSupplyListToSave[index])
      }, 100)
    }

    res.status(200).json({ response: productPropertiesListToSave })
  } catch (error: any) {
    res.status(400).json({ response: 'Error while syncing!!!'})
  }
}

const getSTGProductOrderPropertiesList = async (stockOwnerId = 1) => {
  try {
    const orderPropertyList = await axios.get(
      `http://develop-inv-opt-managementtool.eba-xek2hrc7.ap-northeast-1.elasticbeanstalk.com/api/invopt/1.0/product_order_properties?search=stock_owner_id=${stockOwnerId}`,
      {
        headers: {
          'content-type': 'application/json',
          'authorization': 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiIsImp0aSI6IjYxNWE5ZmNhNjI1MGQifQ.eyJpc3MiOiIiLCJhdWQiOiJvcmdhbml6YXRpb24iLCJqdGkiOiI2MTVhOWZjYTYyNTBkIiwiaWF0IjoxNjMzMzI5MDk4LCJuYmYiOjE2MzMzMjkwODgsImV4cCI6MTk0ODY4OTA5OCwidWlkIjoxfQ.T3LIMVBYAR5I0moANaIbZBDYWqVB9oysXRGI5ou8f6M',
          'x-api-key': 'za24jjhS9661zvLa2l7hN7PIka5PLnhU4NcH68r6'
        }
      }
    )
    return orderPropertyList.data.result
  } catch (error) {
    return null
  }
}

const postSyncProductOrderProperties = async (data: any) => {
  try {
    const apiResponse = await axios.post(
      `https://7e60jgo9z6.execute-api.ap-northeast-1.amazonaws.com/production/api/invopt/1.0/product_order_properties`,
      data,
      { headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiIsImp0aSI6IjYzMDcwZDZjYWU0YzgifQ.eyJpc3MiOiIiLCJhdWQiOiJvcmdhbml6YXRpb24iLCJqdGkiOiI2MzA3MGQ2Y2FlNGM4IiwiaWF0IjoxNjYxNDA2NTcyLCJuYmYiOjE2NjE0MDY1NjIsImV4cCI6MTk3Njc2NjU3MiwidWlkIjoxfQ.eSVT8CDYr6-zzivDkYbQ2afGJBKFWfKbiLClZnB80Aw',
        'x-api-key': '9vtQFbAQCd3D8zcNAUw8w1Wqv6amiGg91qvASwVM'
        }
      }
    )
    return apiResponse
    // return ''
  } catch(error: any) {
    console.log('Error while saving recommended list', error.toString())
  }
}

const postSyncProductSupplyProperties = async (data: any) => {
  try {
    const apiResponse = await axios.post(
      `https://7e60jgo9z6.execute-api.ap-northeast-1.amazonaws.com/production/api/invopt/1.0/product_supply_properties`,
      data,
      { headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiIsImp0aSI6IjYzMDcwZDZjYWU0YzgifQ.eyJpc3MiOiIiLCJhdWQiOiJvcmdhbml6YXRpb24iLCJqdGkiOiI2MzA3MGQ2Y2FlNGM4IiwiaWF0IjoxNjYxNDA2NTcyLCJuYmYiOjE2NjE0MDY1NjIsImV4cCI6MTk3Njc2NjU3MiwidWlkIjoxfQ.eSVT8CDYr6-zzivDkYbQ2afGJBKFWfKbiLClZnB80Aw',
        'x-api-key': '9vtQFbAQCd3D8zcNAUw8w1Wqv6amiGg91qvASwVM'
        }
      }
    )
    return apiResponse
    // return ''
  } catch(error: any) {
    console.log('Error while saving recommended list', error.toString())
  }
}

export const postDailyOrderRecommendation = async (req: Request, res: Response) => {
  const queryDate = date.format(new Date(), 'YYYY-MM-DD').toString()

  const productWithSummariesList = await getProductWithSummaries()
  if (productWithSummariesList === null) return res.status(400).json({ message: 'Cannot find Product Details. Please try again later !!!' })

  const productOrderPropertiesList = await getProductOrderPropertiesList()
  if (productOrderPropertiesList === null) return res.status(400).json({ message: 'Cannot find Product Order Properties. Please try again later !!!' })
 
  let invtConnection: any = null
  let coreConnection: any = null

  try {
    const productOrderHistoriesList = await getProductOrderHistories()
    const productSupplyPropertiesList = await getProductSupplyPropertiesList()

    invtConnection = mysql.createConnection({
      host: process.env.INVT_DB_HOST,
      user: process.env.INVT_DB_USER,
      password: process.env.INVT_DB_PASSWORD,
      database: process.env.INVT_DB_DATABASE
    })

    coreConnection = mysql.createConnection({
      host: process.env.CORE_DB_HOST,
      user: process.env.CORE_DB_USER,
      password: process.env.CORE_DB_PASSWORD,
      database: process.env.CORE_DB_DATABASE
    })

    const allDeliveryCycles = await getAllDeliveryCycles(invtConnection)
    const stockList = await getStockList()

    const allSalesHistoriesList = await getAllSalesHistories(coreConnection)
    const allStockHistoriesList = await getAllStockHistories()

    const allOrderList = await getLast15DaysOrders(coreConnection)
    const allCanceledOrderList = allOrderList.filter((item: any) => item.order_cancel_flg === 1)
    const allSuccessfulOrderList = allOrderList.filter((item: any) => item.order_cancel_flg === 0)

    for (const item of productOrderPropertiesList) {
      const productInformation = productWithSummariesList.find((product:any) => product.id === item.product_id)
      if (productInformation === null || productInformation === undefined) continue
      
      const currentStock = productInformation.stock_summaries[0].total_available_quantity

      const forecastList = await getForecastList(invtConnection, item.product_id, queryDate)

      const orderDeliveryDetails = await getOrderAndDeliveryDates(allDeliveryCycles, item.product_id, queryDate)
      const nextOrderDate = orderDeliveryDetails.nextOrderDate
      const nextDeliveryDate = orderDeliveryDetails.nextDeliveryDate
      const nextNextDeliveryDate = orderDeliveryDetails.nextNextDeliveryDate
      
      const stockDetails = stockList.find((stock: any) => stock.product_id === item.product_id)

      const salesHistoryByStockId = allSalesHistoriesList.filter((item: any) => item.stock_id === stockDetails.id)
      const canceledOrderById = allCanceledOrderList.filter((item: any) => parseInt(item.product_id) === parseInt(productInformation.id))
      const successfulOrderById = allSuccessfulOrderList.filter((item: any) => parseInt(item.product_id) === parseInt(productInformation.id))
      const stockHistoriesListByStockId = allStockHistoriesList.filter((item: any) => item.stock_id === stockDetails.id)

      let historySalesList = getHistorySalesHistoriesByStockId(salesHistoryByStockId, stockHistoriesListByStockId, successfulOrderById, canceledOrderById)
      
      let averageSalesForWeek: any = 0
      if (historySalesList.length > 0) {
        const listForAverage = historySalesList.slice(-8, -1) //last 7 days
        averageSalesForWeek = Math.ceil(listForAverage.reduce((accumulator: any, object: any) => {
          return accumulator + Math.abs(object.sales)
        }, 0) / 7)
      }

      const safetyStockQuantity = item.safty_stock_day * averageSalesForWeek
      const previousDayStock = historySalesList.length > 2 ? historySalesList[historySalesList.length-2].stock_amt : 0
      const predictedStandardStockDetails = getPredictedStandardStockDetails(
                                            forecastList,
                                            productOrderHistoriesList,
                                            item.product_id,
                                            previousDayStock,
                                            // previousDayStockQuantity,
                                            // currentStock,
                                            safetyStockQuantity,
                                            // item.safty_stock_quantity,
                                            queryDate,
                                            nextDeliveryDate,
                                            nextNextDeliveryDate
                                          )
      const futureSales = await getFutureSalesList(
        forecastList,
        historySalesList,
        item.product_id,
        // currentStock,
        // previousDayStockQuantity,
        previousDayStock,
        productInformation.stock_summaries[0]?.summaries
      )

      const noHistorySalesList = []
      if (historySalesList.length === 0) {
        let historyDate: any = date.format(new Date(), 'YYYY/MM/DD')
        for (let i=0; i<15; i++) {
          noHistorySalesList.push(
            {
              date: historyDate.slice(5, 10),
              sales: 0,
              canceled_sales: 0,
              disposal: 0,
              delivery_history: 0,
              delivery: [],
              stock_amt: 0
            }
          )
          historyDate = date.format(date.addDays(new Date(historyDate), -1), 'YYYY/MM/DD')
        }
        noHistorySalesList.sort((p1:any, p2:any) => (p2.date < p1.date) ? 1 : (p2.date > p1.date) ? -1 : 0)
        historySalesList = noHistorySalesList
      }

      if (futureSales.length > 0) historySalesList.pop()
      const stockPrediction = historySalesList.concat(futureSales)

      const lotDetails = productSupplyPropertiesList !== null ? getProductLotDetails(productSupplyPropertiesList, item.id, predictedStandardStockDetails.necessaryQuantity) : ''
      

      const primaryCategory = !isEmptyObject(productInformation.product_category_l) ? productInformation.product_category_l.name : ''
      const secondaryCategory = !isEmptyObject(productInformation.product_category_m) ? productInformation.product_category_m.name : ''
      const tertiaryCategory = !isEmptyObject(productInformation.product_category_s) ? productInformation.product_category_s.name : ''

      const insertSqlQuery = `
        insert into daily_order_recommendation_products (
          query_date, primary_category, secondary_category, tertiary_category, product_id, product_code,
          jan_code, product_name, product_image, price_with_tax,
          next_order_date, next_delivery_date, next_next_order_date, next_next_delivery_date, current_stock,
          predicted_stock_at_delivery_time, standard_stock_at_delivery_time, necessary_quantity,
          recommended_order_lot, recommended_order_items, stop_selling)
        VALUES (
          '${queryDate}', '${primaryCategory}', '${secondaryCategory}', '${tertiaryCategory}', ${productInformation.id}, '${productInformation.product_code}',
          '${productInformation.local_code}', "${productInformation.product_name}", '${productInformation.image_url}', ${parseFloat(productInformation.value_price_with_tax).toFixed(2)},
          '${nextOrderDate}', '${nextDeliveryDate}', '2022-01-01', '${nextNextDeliveryDate}', ${currentStock},
          ${predictedStandardStockDetails.predictedStock}, ${predictedStandardStockDetails.standardStock}, ${predictedStandardStockDetails.necessaryQuantity},
          ${lotDetails.lot}, ${lotDetails.lot}, 0);  
      `
      // await invtConnection.promise().query(insertSqlQuery)

      invtConnection.query(insertSqlQuery, (err, rows) => {
        if (err) throw err
        console.log("Row inserted with id = "
            + rows.insertId)
      })

    }
  } catch (error: any) {
    // invtConnection.end()
    // coreConnection.end()
    return res.status(400).json({ message: `Cannot get list. Please try again later. ${error.toString()}` })
  }
  res.status(200).json({ message: 'Data Saved!!!!' })
}