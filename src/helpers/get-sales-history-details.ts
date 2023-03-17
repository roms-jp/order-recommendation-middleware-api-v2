import axios from 'axios'
import date from 'date-and-time'

import { coreApiConfig } from '../configs/api-header-config'

export const getAllSalesHistories = async(coreConnection: any) => {
  try {
    const [salesHistories] = await coreConnection.promise().query('SELECT * FROM gateway_core.stock_change_histories')
    return salesHistories
  } catch (error) {
    console.log('error while getting Sales Histories')
    return []
  }
}

export const getSalesHistoriesByDaysAndId = async (days: number, stockId: number) => {
  const resultList: any = []
  try {
    const queryParams = `search=stock_id=${stockId}`
    const LIST: any = await axios.get(
      `${coreApiConfig.baseUrl}/api/core/1.0/stock_change_histories?${queryParams}`,
      { headers: coreApiConfig.headerConfig }
    )
      
    if (LIST.data.result.length === 0) return []
      
    const stockAmountList = await getStockHistoryListByStockId(stockId)
    const menuOrderList = await getMenuOrders()

    const deliveryList = LIST.data.result.filter((history: any) => history.regist_type === 1)
    const salesList = LIST.data.result.filter((history:any) => history.regist_type === 2 && menuOrderList.some((menuOrder: any) => menuOrder.id === history.order_id))
    const disposalList = LIST.data.result.filter((history: any) => history.regist_type === 10)
    
    let queryDate: any = date.format(new Date(), 'YYYY/MM/DD')
    for (let i=0; i<15; i++) {
      const deliveries = deliveryList.filter((element: any) => date.format(new Date(element.move_date.substring(0, 10)), 'YYYY/MM/DD') === queryDate)
      const sales = salesList.filter((element: any) => date.format(new Date(element.move_date.substring(0, 10)), 'YYYY/MM/DD') === queryDate)
      const disposal = disposalList.filter((element: any) => date.format(new Date(element.move_date.substring(0, 10)), 'YYYY/MM/DD') === queryDate)
      const stockAmount = stockAmountList.filter((element: any) => element.summary_date === queryDate)
      
      resultList.push(
        {
          date: queryDate.slice(5, 10),
          sales: sales.length === 0 || sales === undefined ? 0 : Math.abs(getTotalNumberFromArray(sales)) * -1, // making it negative for graph
          disposal: disposal.length === 0 || disposal === undefined ? 0 : Math.abs(getTotalNumberFromArray(disposal)) * -1, // making it negative for graph
          delivery_history: deliveries.length === 0 || deliveries === undefined ? 0 : getTotalNumberFromArray(deliveries),
          delivery: [],
          stock_amt: stockAmount.length === 0 || stockAmount === undefined ? 0 : stockAmount[0].total_quantity
        }
      )
      queryDate = date.format(date.addDays(new Date(queryDate), -1), 'YYYY/MM/DD')
    }
    const sumResult: any = resultList.reduce((previousValue: any, currentValue: any) => {
      return {
        sales: Math.abs(previousValue.sales) + Math.abs(currentValue.sales),
        disposal: previousValue.disposal + currentValue.disposal,
        delivery_history: previousValue.delivery_history + currentValue.delivery_history,
        stock_amt: previousValue.stock_amt + currentValue.stock_amt
      }
    })

    if (sumResult.sales === 0 && sumResult.disposal === 0 && sumResult.delivery_history === 0 && sumResult.stock_amt === 0) return []

    return resultList.sort((p1:any, p2:any) => (p2.date < p1.date) ? 1 : (p2.date > p1.date) ? -1 : 0)
  } catch(error) {
    console.log('error=', error)
    return []
  }
}

const getTotalNumberFromArray = (array: any) => {
  return array.reduce((accumulator: any, object: any) => {
    return accumulator + object.move_quantity
  }, 0)
}

const getStockHistoryListByStockId = async (stockId: number) => {
  try {
    const listById = await axios.get(
      `${coreApiConfig.baseUrl}/api/core/1.0/stock_histories?search=stock_id=${stockId}`,
      { headers: coreApiConfig.headerConfig }
    )
    return listById.data.result
  } catch (error) {
    return []
  }
}

export const getMenuOrders = async () => {
  try {
    const list = await axios.get(
      `${coreApiConfig.baseUrl}/api/core/1.0/orders?search=commerce_id=1`,
      { headers: coreApiConfig.headerConfig }
      )
    return list.data.result
  } catch(error) {
    return []
  }
}