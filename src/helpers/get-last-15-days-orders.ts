export const getLast15DaysOrders = async(coreConnection: any) => {
  const sqlQuery = `
    SELECT
      gateway_core.order_products.product_id,
      gateway_core.order_products.product_code,
      SUM(gateway_core.order_products.quantity) as quantity,
      gateway_core.order_products.order_id,
      gateway_core.orders.id,
      DATE(gateway_core.orders.order_date) as order_date,
      gateway_core.orders.order_cancel_flg
    FROM
      gateway_core.order_products
    JOIN
      gateway_core.orders
    ON 
      gateway_core.orders.id = gateway_core.order_products.order_id
    where
      gateway_core.orders.order_date > now() - INTERVAL 15 day AND
      gateway_core.orders.commerce_id = 1
    group by 
      gateway_core.order_products.product_id, gateway_core.orders.order_cancel_flg, DATE(gateway_core.orders.order_date)
    order by order_date;`
  try {
    const [orders] = await coreConnection.promise().query(sqlQuery)
    return orders
  } catch (error: any) {
    console.log('error while getting Canceled Order Histories', error.toString())
    return []
  }
}