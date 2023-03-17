import { Request } from 'express'

export interface OrderAttributesRequest extends Request {
  query: {
    query_date: string
    stock_owner_id: string | undefined
    category_l: string | undefined
    category_m: string | undefined
    category_s: string | undefined
    search: string
  }
}