import mysql from 'mysql2'

export const getOrderDeliveryCyclesList = async () => {
  try {
    const invtConnection = mysql.createConnection({
      host: process.env.INVT_DB_HOST,
      user: process.env.INVT_DB_USER,
      password: process.env.INVT_DB_PASSWORD,
      database: process.env.INVT_DB_DATABASE
    })

    const sqlQuery = 'SELECT * FROM invopt.order_delivery_cycles'
    const [orderDeliveryCyclesRow] = await invtConnection.promise().query(sqlQuery)
    return orderDeliveryCyclesRow
  } catch (error) {
    return []
  }
}

export const getDeliveryCycleFromId = (list: any, id: string) => {
  const days = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日','土曜日']
  const deliveryCycles: any = []
  const listById = list.filter((data: any) => data.product_order_property_id === id)

    listById.forEach((item: any) => {
      const daysToDilver = item.order_week + item.delivery_leadtime
      const deliveryDay =  days[(daysToDilver % 7 + 7) % 7]
      deliveryCycles.push(
        {
          order_day: days[item.order_week],
          delivery_day: deliveryDay
        }
      )
    })
  return deliveryCycles
}