import date from 'date-and-time'
import { find, uniqBy, sumBy, orderBy, groupBy, map } from 'lodash'

import { isEmptyArray, isEmptyString } from './app'

type CategoryType = string | undefined

const filterProductsBasedOnCategoryType = (productList: any, categoryType: string, categories: string) => {
  let result :any = []
  const categoryList = categories.split(',')

  categoryList.forEach((category: any) => {
    const arr = productList.filter((element:any) => parseInt(element[categoryType].id) === parseInt(category))
    result = result.concat(arr)
  })
  return result
}

export const getProductListByCategory = (productList: any, categoryLarge: CategoryType, categoryMedium: CategoryType, categorySmall: CategoryType) => {
  if (isEmptyString(categoryLarge) && isEmptyString(categoryMedium) && isEmptyString(categorySmall)) return productList

  let allProducts: any = []

  if (categoryLarge !== undefined) allProducts = allProducts.concat(filterProductsBasedOnCategoryType(productList, 'product_category_l', categoryLarge))
  if (categoryMedium !== undefined) allProducts = allProducts.concat(filterProductsBasedOnCategoryType(productList, 'product_category_m', categoryMedium))
  if (categorySmall !== undefined) allProducts = allProducts.concat(filterProductsBasedOnCategoryType(productList, 'product_category_s', categorySmall))

  return uniqBy(allProducts, 'id')
}

export const getProductHistoryByIdAndDateFromList = (list: any, productId: number, queryDate: string) => {
  const listBasedOnId = list.filter((data: any) => productId === data.product_id)
  if (listBasedOnId === undefined || listBasedOnId.length === 0) return {}
  else {
    const formattedDate = queryDate.replaceAll('-', '/')
    const currentDay = new Date(queryDate).getDay()
    let checkDate: any = formattedDate
    if (currentDay === 6) checkDate = date.format(date.addDays(new Date(queryDate), -1), 'YYYY/MM/DD').toString()
    if (currentDay === 0) checkDate = date.format(date.addDays(new Date(queryDate), -2), 'YYYY/MM/DD').toString()
    if (currentDay === 1) checkDate = date.format(date.addDays(new Date(queryDate), -3), 'YYYY/MM/DD').toString()

    const listForSelectedDate = listBasedOnId.filter((data: any) => data.schedule_arrival_date >= checkDate)
    if (listForSelectedDate.length === 0 || listForSelectedDate === undefined) return {}
    else {
      return {
        data:
        {
          product_id: listForSelectedDate[0].product_id,
          product_code: listForSelectedDate[0].product_code,
          product_order_date: listForSelectedDate[0].product_order_date,
          schedule_arrival_date: listForSelectedDate[0].schedule_arrival_date,
          schedule_arrival_quantity: sumBy(listForSelectedDate, 'schedule_arrival_quantity')
        }
      }
    }
  }
}

export const getAllDeliveryCycles = async (invtConnection: any) => {
  try {
    const [deliveryRow] = await invtConnection.promise().query('SELECT * FROM invopt.order_delivery_cycles')
    return deliveryRow
  } catch (error) {
    console.log('error while getting Delivery Cycles')
    return []
  }
}

export const getOrderAndDeliveryDates = async (list: any, productOrderPropertyId: string, queryDate: string) => {
  try {
    let deliveryCyclesDetails = list.filter((item: any) => item.product_order_property_id === parseInt(productOrderPropertyId))
    const queryDay = new Date(queryDate).getDay()

    let nextOrderDate: any = ''
    let nextDeliveryDate: any = ''
    let nextNextDeliveryDate: any = ''
    let nextNextOrderDate: any = ''
  
    if (deliveryCyclesDetails.length > 1) {
      const delivery1 = deliveryCyclesDetails[0]
      const delivery2 = deliveryCyclesDetails[1]

      const orderDays1 = delivery1.order_week === queryDate ? 0 :
                          delivery1.order_week < queryDay
                            ? 6 - queryDay + 1 + delivery1.order_week
                            : delivery1.order_week - queryDay
      const orderDays2 = delivery2.order_week === queryDate ? 0 :
                            delivery2.order_week < queryDay
                              ? 6 - queryDay + 1 + delivery2.order_week
                              : delivery2.order_week - queryDay

      if (orderDays1 < orderDays2) {
        nextOrderDate = date.format(date.addDays(new Date(queryDate), orderDays1), 'YYYY-MM-DD')
        nextNextOrderDate = date.format(date.addDays(new Date(queryDate), orderDays2), 'YYYY-MM-DD')
        nextDeliveryDate = date.format(date.addDays(new Date(nextOrderDate), delivery1.delivery_leadtime), 'YYYY-MM-DD')
        nextNextDeliveryDate = date.format(date.addDays(new Date(nextNextOrderDate), delivery2.delivery_leadtime), 'YYYY-MM-DD')
      } else {
        nextOrderDate = date.format(date.addDays(new Date(queryDate), orderDays2), 'YYYY-MM-DD')
        nextNextOrderDate = date.format(date.addDays(new Date(queryDate), orderDays1), 'YYYY-MM-DD')
        nextDeliveryDate = date.format(date.addDays(new Date(nextOrderDate), delivery2.delivery_leadtime), 'YYYY-MM-DD')
        nextNextDeliveryDate = date.format(date.addDays(new Date(nextNextOrderDate), delivery1.delivery_leadtime), 'YYYY-MM-DD')
      }
    } else {
      deliveryCyclesDetails = deliveryCyclesDetails[0]
      const orderDays = deliveryCyclesDetails.order_week === queryDate ? 0 :
                        deliveryCyclesDetails.order_week < queryDay
                          ? 6 - queryDay + 1 + deliveryCyclesDetails.order_week
                          : deliveryCyclesDetails.order_week - queryDay
      nextOrderDate = date.format(date.addDays(new Date(queryDate), orderDays), 'YYYY-MM-DD')
      nextDeliveryDate = date.format(date.addDays(new Date(nextOrderDate), deliveryCyclesDetails.delivery_leadtime), 'YYYY-MM-DD')
      nextNextDeliveryDate = date.format(date.addDays(new Date(nextDeliveryDate), 7), 'YYYY-MM-DD')
    }

    return {
      nextOrderDate: nextOrderDate,
      nextDeliveryDate: nextDeliveryDate,
      nextNextDeliveryDate: nextNextDeliveryDate
    }
  } catch (error) {
    // console.log('error=', error)
    return {
      nextOrderDate: '',
      nextDeliveryDate: '',
      nextNextDeliveryDate: ''
    }
  }
}

export const getFutureSalesList = async (forecastList: any, historiesList: any, productId: string, currentStockAmount: number, futureDisposalList: any) => {
  try {
    let stockAmount:number = currentStockAmount
    const futureSales = []

    if (forecastList.length === 0 && historiesList.length === 0) return []
    if (forecastList.length === 0) return [{
      date: date.format(new Date(), 'MM/DD'),
      predicted_sales: 0,
      delivery: 0,
      delivery_history: [],
      disposal: 0,
      stock_amt: stockAmount
    }]

    for (const data of forecastList) {
      const deliveryAmount = getExpectedDeliveryQuantityById(historiesList, productId, date.format(data.target_date, 'YYYY/MM/DD'), null)
      const salesAmount:number = Math.floor(data.quantity)
      const disposalAmount:number = getFutureDisposalAmountByDate(futureDisposalList, date.format(data.target_date, 'YYYY/MM/DD'))
      stockAmount = (stockAmount*1) + (deliveryAmount*1) - (salesAmount*1) - (disposalAmount*1)

      futureSales.push({
        date: date.format(data.target_date, 'MM/DD'),
        predicted_sales: Math.abs(salesAmount) * -1, //making it negative value for graph
        canceled_sales: 0,
        delivery: deliveryAmount,
        delivery_history: 0,
        disposal: disposalAmount * -1, //making it negative value for graph
        stock_amt: stockAmount
      })
    }
    return futureSales
  } catch (error) {
    console.log(error)
    return []
  }
}

export const getForecastList = async (invOptDBConnection: any, productOrderPId: string, queryDate: string) => {
  try {
    const queryString = 'select * from invopt.sales_forecasts where product_order_property_id=? AND target_date >= ? AND target_date < ? + INTERVAL 15 DAY'
    const [forecastList] = await invOptDBConnection.promise().query(queryString, [productOrderPId, queryDate, queryDate])

    return forecastList
  } catch(error: any) {
    console.log(`Fetching Sales Forecast Error: ${error.toString()}`)
    return []
  }
}

export const getExpectedDeliveryQuantityById = (list: any, productId: string, queryDate: string, nextNextDeliveryDate: string | null) => {
  if (list === null) return 0
  const listBasedOnId = list.filter((data: any) => productId === data.product_id)
  if (listBasedOnId === undefined || listBasedOnId.length === 0) return 0
  else {
    const formattedDate = queryDate.replaceAll('-', '/')
    let listForSelectedDate = []
    if (nextNextDeliveryDate === null) {
      listForSelectedDate = listBasedOnId.filter((data: any) => formattedDate === data.schedule_arrival_date)
    } else {
      const formattedNextDate = nextNextDeliveryDate.replaceAll('-', '/')
      listForSelectedDate = listBasedOnId.filter((data: any) => formattedDate <= data.schedule_arrival_date && formattedNextDate >= data.schedule_arrival_date)
    }
    if (listForSelectedDate.length === 0 || listForSelectedDate === undefined) return 0
    else return listForSelectedDate.reduce((acc: any, current: any) => acc + Number.parseInt(current.schedule_arrival_quantity), 0)
  }
}

export const getPredictedStandardStockDetails = (
  forecastList: any,
  productHistoriesList: any,
  productId: string,
  previousDayStockQuantity: number,
  safetyStock: number,
  queryDate: string,
  nextDeliveryDate: string,
  nextNextDeliveryDate: string
) => {
  const todayPredictedSales = forecastList.length > 0 ? forecastList[0].quantity : 0
  
  const lastDayEoDStock = previousDayStockQuantity //need to check the logic for getting EoD stock of last day

  const todayExpectedDelivery = getExpectedDeliveryQuantityById(productHistoriesList, productId, queryDate, null)
  const todayWaste = 0 // need to check the logic for getting today's waste number
  const todayStock = lastDayEoDStock + todayExpectedDelivery - todayPredictedSales - todayWaste

  const tomorrowDate = date.format(date.addDays(new Date(queryDate), 1), 'YYYY-MM-DD')
  const dayAfterNextDeliveryDate = date.format(date.addDays(new Date(nextDeliveryDate), 1), 'YYYY-MM-DD')

  const plannedWasteOfArrivalLT = 0 //need to check the logic for getting the number
  const plannedWasteOfLT = 0 //need to check the logic for getting the number

  const plannedDeliveryOfArrivalLT = getExpectedDeliveryQuantityById(productHistoriesList, productId, tomorrowDate, nextDeliveryDate)
  const predDeliveryOfLT = getExpectedDeliveryQuantityById(productHistoriesList, productId, dayAfterNextDeliveryDate, nextNextDeliveryDate)

  const predSalesOfArrivalLT = forecastList.length > 0 ? getPredictedSalesofArrivalLT(nextDeliveryDate, forecastList, queryDate) : 0
  const predSalesOfLT = forecastList.length > 0 ? getPredictedSalesOfLT(nextNextDeliveryDate, forecastList, queryDate, predSalesOfArrivalLT) : 0

  let predictedStock = todayStock + plannedDeliveryOfArrivalLT - predSalesOfArrivalLT - plannedWasteOfArrivalLT
  predictedStock = predictedStock > 0 ? Math.floor(predictedStock) : Math.floor(Math.abs(predictedStock)) * -1
  const standardStock = Math.floor(safetyStock + predSalesOfLT + predDeliveryOfLT - plannedWasteOfLT)

  return {
    predictedStock,
    standardStock,
    necessaryQuantity: predictedStock < 0 ? standardStock : standardStock - predictedStock
  }
}

const getPredictedSalesofArrivalLT = (nextDeliveryDate: string, forecastList: any, queryDate: string) => {
  if (isEmptyString(nextDeliveryDate) || isEmptyArray(forecastList)) return 0

  let predSalesOfArrivalLT = 0
  for (let i=0; i<forecastList.length; i++) {
    const forcastDate = date.format(new Date(forecastList[i].target_date), 'YYYY-MM-DD')
    if (queryDate < forcastDate && nextDeliveryDate >= forcastDate) predSalesOfArrivalLT = predSalesOfArrivalLT + Math.floor(forecastList[i].quantity)
  }
  return predSalesOfArrivalLT
}

const getPredictedSalesOfLT = (nextNextDeliveryDate: string, forecastList: any, queryDate: string, predSalesOfArrivalLT: number) => {
  let tempValue = 0
  for (let i=0; i<forecastList.length; i++) {
    const forcastDate = date.format(new Date(forecastList[i].target_date), 'YYYY-MM-DD')
    if (queryDate < forcastDate && nextNextDeliveryDate >= forcastDate) tempValue = tempValue + Math.floor(forecastList[i].quantity)
  }
  return tempValue - predSalesOfArrivalLT
}

export const getProductLotDetails = (productSupplyPropertiesList: any, productId: string, quantity: number) => {
  if (productSupplyPropertiesList.length <= 0) return { lot: 0, item: quantity }
  const product = productSupplyPropertiesList.find((item: any) => productId === item.product_id)
  if (product === undefined || product.quantity_per_case === 1) return { lot: 0, item: quantity }

  return {
    lot: quantity / parseInt(product.quantity_per_case),
    item: quantity % product.quantity_per_case
  }
}

export const getListWithFilteredBelowOrderPoint = (list: any) => {
  if (list.length === 0 || list === undefined) return []
  return list.filter((item: any) => {
    if (item.necessary_quantity && item.necessary_quantity > 0) {
      return item
    }
  })
}

export const getSortedResult = (listToSort: any, list: any) => {
  const sortedList = orderBy(listToSort, ['next_order_date', 'necessary_quantity'], ['asc', 'desc'])
  if (list.length === 0) return listToSort

  let orderedList: any = []
  for (const item of list) {
    const object = sortedList.find((element: any) => element.product_id === item.product_id && element.necessary_quantity <= item.schedule_arrival_quantity)
    if (object !== undefined) orderedList.push(object)
  }

  let unOrderedList:any = []
    for (const allItem of sortedList) {
      if (orderedList.find((item: any) => allItem.product_id === item.product_id) === undefined) unOrderedList.push(allItem)
    }
  return unOrderedList.concat(orderedList)
}

export const getFutureDisposalAmountByDate = (futureDisposalList: any, forecastDate: any) => {
  if (isEmptyArray(futureDisposalList)) return 0

  let disposalAmount = 0
  for (const disposalItem of futureDisposalList) {
    if (forecastDate === disposalItem.sell_by_date.substring(0, 10)) {
      disposalAmount = disposalAmount + disposalItem.quantity
    }
  }
  return disposalAmount
}

export const formatProductListForUI = (list: any) => {
  const dataList: any = []
  const result: any = []
  const urgentListToOrder: any = []

  let queryDate: any = date.format(new Date(), 'YYYY-MM-DD')

  const data = map(groupBy(list, "next_order_date"), (item: any) => {
    dataList.push(item)
    const date = item[0].next_order_date
    const number = item.filter((obj: any) => obj.necessary_quantity > 0).length
    return { label: date, count: number, data: dataList }
  })

  for (let i=0; i < data.length; i++) {
    const item = data[i]
    const label = item.label
    let count = item.count
    const list = item.data[i]
    const dateList:any = []
    for (let k=0; k<list.length; k++) {
      const product = list[k]
      if (product.predicted_stock_at_delivery_time < 0 && product.next_order_date !== queryDate) {
        const itemToUpdate = {...product }
        itemToUpdate.necessary_quantity = Math.abs(itemToUpdate.predicted_stock_at_delivery_time)
        urgentListToOrder.push(itemToUpdate)
        // count --
      }
      // else {
      //   dateList.push(product)
      // }
      dateList.push(product)
    }
    result.push({ label: label, count: count, data: dateList })
  }
  if (urgentListToOrder.length > 0) result.unshift({ label: "緊急発注", count: urgentListToOrder.length, data: urgentListToOrder })
  return result
}