// import { connectToRedshift } from '../configs/redshift'
import { getRedshiftConnection, closeConnection } from '../configs/redshift'

export const getPreviousDayStockQuantityByProductId = async (previousDate: string) => {
  // try {
  //   const conn = await connectToRedshift()
  //   if(conn === null) return []
  //   else {
  //     const sqlQuery = `
  //       SELECT * FROM "dev"."snapshots"."union_gateway_core__stocks_snapshot"
  //       where dbt_valid_from <= '${previousDate}'
  //       and (dbt_valid_to >= '${previousDate}' or dbt_valid_to is null)
  //       and _organization_code='meta';
  //     `
  //     conn.query(sqlQuery, (err, res) => {
  //       if (err) {
  //         console.error(err)
  //         conn.end()
  //         return []
  //       }
  //       return res.rows
  //     })
  //   }
  try {
    const conn = await getRedshiftConnection()
    const query = `
      SELECT * FROM "dev"."snapshots"."union_gateway_core__stocks_snapshot"
      where dbt_valid_from <= '${previousDate}'
      and (dbt_valid_to >= '${previousDate}' or dbt_valid_to is null)
      and _organization_code='meta';
    `
    const result = await conn.query(query)
    closeConnection()
    return result
  } catch (error: any) {
    console.log('getting Previous Day stock error=', error)
    return []
  }
}