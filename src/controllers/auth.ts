import { authenticateUserFromByAndPassword } from '../middlewares/authenticate-user'

import { isEmptyString } from '../utils/app'

export const loginUser = async (req: any, res: any) => {
  const { userName, password } = req.body
  const errors = { userName: '', password: ''}
  if (isEmptyString(userName)) errors.userName = 'User Name is Empty'
  if (isEmptyString(password)) errors.password = 'Password is Empty'

  if (!isEmptyString(errors.userName) || !isEmptyString(errors.password)) return res.status(400).json({ data: errors })

  try {
    const data: any = await authenticateUserFromByAndPassword(userName, password)
    const result = {
      accessToken: `Bearer ${data.idToken.jwtToken}`,
      displayName: data.accessToken.payload.username
    }
    return res.status(200).json({ response: result })
  } catch (error: any) {
    let errorMessage = ''
    if (error.code === 'NotAuthorizedException') errorMessage = 'Authorization Error. Please try again !!!'
    else errorMessage = 'Unexpected Error. Please try again !!!'

    if (error.code === 'NotAuthorizedException') return res.status(400).json({ response: errorMessage })
  }
}