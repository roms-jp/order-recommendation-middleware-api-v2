import axios from 'axios'
import { Request, Response } from 'express'
import { coreApiConfig } from '../configs/api-header-config'

export const getCategoriesList = async (req: Request, res: Response) => {
  try {
    const list = await axios.get(
      `${coreApiConfig.baseUrl}/api/core/1.0/categories/tree`,
      { headers: coreApiConfig.headerConfig }
    )
    res.status(200).json({ data: list.data })
  } catch (error) {
    return res.status(400).json({ data: [] })
  }
}