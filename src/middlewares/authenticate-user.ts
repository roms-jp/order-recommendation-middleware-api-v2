import { CognitoUser, AuthenticationDetails, CognitoUserPool } from 'amazon-cognito-identity-js'

export const authenticateUserFromByAndPassword = async (userName: string, password: string) => {
  const userPoolId = 'ap-northeast-1_KbQS2tWIO'
  const userPoolClientId= '21hud72ratp4ioued9l9r61sdo'

  const poolData = {
    UserPoolId: userPoolId,
    ClientId: userPoolClientId
  }

  try {
    const userPool = new CognitoUserPool(poolData)
    const authenticationData = {
      Username : userName,
      Password : password
    }

    const authenticationDetails = new AuthenticationDetails(authenticationData)
    var userData = {
      Username : userName,
      Pool : userPool
    }

    const cognitoUser: any = new CognitoUser(userData)

    return new Promise(function(resolve, reject) {
      cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: resolve,
        onFailure: reject
      })
    })
  } catch (error: any) {
    console.log('error=', error)
    return ({
      error: error.toString()
    })
  }
}