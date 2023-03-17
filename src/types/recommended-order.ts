import { Request } from 'express'

export interface OrderRecommendationRequest extends Request {
  query: {
    query_date: string
    stock_owner_id: string | undefined
    category_l: string | undefined
    category_m: string | undefined
    category_s: string | undefined
    below_order_point: string
    search: string
  }
}