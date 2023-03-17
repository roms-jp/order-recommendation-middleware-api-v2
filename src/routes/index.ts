import { Router } from 'express'

import { verifyToken } from '../middlewares/verify-token'

import { getCategoriesList } from '../controllers/category-tree'
import { getOrderAttributesList, postOrderAttributesList } from '../controllers/order-attributes'
import { getAllOrderToDeliverList } from '../controllers/order-to-deliver'
import { getRecommendedOrderList, postOrderRecommendationList, postDailyOrderRecommendation, syncDataWithGateway } from '../controllers/recommended-order'
import { loginUser } from '../controllers/auth'

const appRouter = Router()

appRouter.route('/api/v1/order_recommended_list')
  .get(getRecommendedOrderList)
// appRouter.route('/api/v1/order_recommended_list')
//   .post(verifyToken, postOrderRecommendationList)
appRouter.route('/api/v1/order_recommended_list')
  .post(postOrderRecommendationList)
appRouter.route('/api/v1/sync_with_gateway')
  .get(syncDataWithGateway)
appRouter.route('/api/v1/post_daily_order_recommendation')
  .get(postDailyOrderRecommendation) 
appRouter.route('/api/v1/order_attributes_list')
  .get(getOrderAttributesList)
appRouter.route('/api/v1/order_attributes_list')
  .post(postOrderAttributesList)
appRouter.route('/api/v1/order_to_deliver')
  .get(getAllOrderToDeliverList)
appRouter.route('/api/v1/categories_list')
  .get(getCategoriesList)

appRouter.route('/api/v1/login-user')
  .post(loginUser)

export { appRouter }