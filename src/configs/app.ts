const getCORSOptionsConfig = () => {
  const whitelist = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://order-recommendation-ui.roms-gw.com',
    'http://order-recommendation-dashboard.roms-gw.com',
    'http://dashboard-meta.roms-gw.com',
    'http://menu-dashboard.roms-gw.com'
  ]

  return {
    origin: function (origin: any, callback: any) {
      if (!origin || whitelist.indexOf(origin) !== -1) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: true
  }
}

export { getCORSOptionsConfig }