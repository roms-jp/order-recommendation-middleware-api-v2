import axios from 'axios'
import date from 'date-and-time'

import { coreApiConfig } from '../configs/api-header-config'

export const getSalesHistoriesByDaysAndId = async(days: number, stockId: string) => {
  try {
    const todayDate = date.format(new Date(), 'YYYY/MM/DD HH:MM:SS')
    const limitDate = `${date.format(date.addDays(new Date(), -days + 1), 'YYYY/MM/DD')} 23:59:59`
    
    const queryParams = `&search=stock_id=${stockId}`
    const stockChangeHistoriesListById = await axios.get(
      `${coreApiConfig.baseUrl}/api/core/1.0/stock_change_histories?${queryParams}`,
      { headers: coreApiConfig.headerConfig }
    )
    const last2WeeksHistoryList = stockChangeHistoriesListById.data.result.filter((item: any) => item.move_date <= todayDate && item.move_date > limitDate)
    
    if (last2WeeksHistoryList.length === 0) return []

    const deliveryList = last2WeeksHistoryList.filter((history: any) => history.regist_type === 1)
    const salesList = last2WeeksHistoryList.filter((history: any) => history.regist_type === 2)
    const disposalList = last2WeeksHistoryList.filter((history: any) => history.regist_type === 10)

    console.log('deliveryList=', deliveryList)
    const stockAmountList = await getStockHistoryListByStockId(stockId)

    const historyDates = [...new Set(last2WeeksHistoryList.map((item: any) => item.move_date))]
    const resultList = []
  
    for (const historyDate in historyDates) {
      const formattedDate = historyDate.substring(0, 10)
      const deliveries = deliveryList.filter((element: any) => element.move_date === historyDate)
      const sales = salesList.filter((element: any) => element.move_date === historyDate)
      const disposal = disposalList.filter((element: any) => element.move_date === historyDate)
      const stockAmount = stockAmountList.filter((element: any) => element.summary_date === formattedDate)

      resultList.push(
        {
          date: historyDate.slice(5,10),
          sales: sales.length === 0 || sales === undefined ? 0 : Math.abs(getTotalNumberFromArray(sales)) * -1, // making it negative for graph
          disposal: disposal.length === 0 || disposal === undefined ? 0 : Math.abs(getTotalNumberFromArray(disposal)) * -1, // making it negative for graph
          delivery: deliveries.length === 0 || deliveries === undefined ? 0 : getTotalNumberFromArray(deliveries),
          stock_amt: stockAmount.length === 0 || stockAmount === undefined ? 0 : stockAmount[0].total_quantity
        }
      )
    }
    return resultList.sort((p1, p2) => (p2.date < p1.date) ? 1 : (p2.date > p1.date) ? -1 : 0)
  } catch (error) {
    console.log('error=', error)
    return []
  }
}

const getStockHistoryListByStockId = async (stockId: string) => {
  try {
    const stockHistoriesList = await axios.get(
      `${coreApiConfig.baseUrl}/api/core/1.0/stock_histories?search=stock_id=${stockId}`,
      { headers: coreApiConfig.headerConfig }
    )
    return stockHistoriesList.data.result
  } catch (error) {
    return []
  }
}

const getTotalNumberFromArray = (array: any) => {
  return array.reduce((accumulator: any, object: any) => {
    return accumulator + object.move_quantity
  }, 0)
}