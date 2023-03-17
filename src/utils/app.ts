import { uniqBy } from 'lodash'
import date from 'date-and-time'

type CategoryType = string | undefined

export const isEmptyString = (data: string | undefined) => {
  return data === undefined || data === ''
}

export const isEmptyObject = (obj: any | undefined) => {
  return obj === undefined || JSON.stringify(obj) === '{}' || obj === null
}

export const isEmptyArray = (array: any | undefined) => {
  return array.length === 0 || array === undefined
}

export const isPositiveInteger = (str: string) => {
  if (str === '') return false
  const num = Number(str)
  if (Number.isInteger(num) && num >= 0) return true
  else return false
}

export const getSearchFilteredList = (list: any, searchParam: string) => {
  if (isEmptyString(searchParam)) return list
  const listByIds = list.filter((element: any) => element?.id?.toString().normalize("NFKC") === searchParam.trim().normalize("NFKC"))
  const listByJanCode = list.filter((element: any) => element?.local_code?.toString().normalize("NFKC").indexOf(searchParam.trim().normalize("NFKC")) !== -1)
  const listByProductName = list.filter((element: any) => element?.product_name?.toString().normalize("NFKC").indexOf(searchParam.normalize("NFKC")) !== -1)

  return uniqBy([...listByIds, ...listByJanCode, ...listByProductName], 'id')
}

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

export const getHistorySalesHistoriesByStockId = (salesHistoryList: any, stockAmountList: any, successfulOrderList: any, canceledOrderList: any) => {
  if (salesHistoryList.length === 0) return []

  const resultList: any = []

  const deliveryList = salesHistoryList.filter((history: any) => history.regist_type === 1)
  // const salesList = salesHistoryList.filter((history:any) => history.regist_type === 2)
  const disposalList = salesHistoryList.filter((history: any) => history.regist_type === 10)

  let queryDate: any = date.format(new Date(), 'YYYY/MM/DD')
  for (let i=0; i<15; i++) {
    const deliveries = deliveryList.filter((element: any) => date.format(element.move_date, 'YYYY/MM/DD') === queryDate)
    const sales = successfulOrderList.filter((element: any) => date.format(element.order_date, 'YYYY/MM/DD') === queryDate)
    const disposal = disposalList.filter((element: any) => date.format(element.move_date, 'YYYY/MM/DD') === queryDate)
    const canceledSales = canceledOrderList.filter((element: any) => date.format(element.order_date, 'YYYY/MM/DD') === queryDate)
    const stockAmount = stockAmountList.filter((element: any) => element.summary_date === queryDate)
    resultList.push(
      {
        date: queryDate.slice(5, 10),
        sales: sales.length === 0 || sales === undefined ? 0 : sales[0].quantity * -1, // making it negative for graph
        canceled_sales: canceledSales.length === 0 || canceledSales === undefined ? 0 : canceledSales[0].quantity * -1, // making it negative for graph
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
      canceled_sales: Math.abs(previousValue.canceled_sales) + Math.abs(currentValue.canceled_sales),
      disposal: previousValue.disposal + currentValue.disposal,
      delivery_history: previousValue.delivery_history + currentValue.delivery_history,
      stock_amt: previousValue.stock_amt + currentValue.stock_amt
    }
  })

  if (sumResult.sales === 0 && sumResult.disposal === 0 && sumResult.delivery_history === 0 && sumResult.stock_amt === 0 && sumResult.canceled_sales === 0 ) return []

  return resultList.sort((p1:any, p2:any) => (p2.date < p1.date) ? 1 : (p2.date > p1.date) ? -1 : 0)
}

const getTotalNumberFromArray = (array: any) => {
  return array.reduce((accumulator: any, object: any) => {
    return accumulator + object.move_quantity
  }, 0)
}