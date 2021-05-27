let configs = null
try {
  configs = require('./configs.json');
} catch(error) {
  // pass
}
class Helper {
  
  static table = 'SocialMediaMonitor'
  static getSimpleDatabaseConfigs() {
    if (configs && configs.database) {
      return {
        databaseOptions: configs.database
      }
    }
    return {
      databaseOptions: {
        user: '',
        host: '127.0.0.1',
        port: 5432,
        password: '',
        database: ''
      }
    }
  }

  static getFacebookPages() {
    if (configs && configs.facebook) {
      return configs.facebook
    }
    return [{
      id: '',
      token: ''
    }]
  }

  static getTableName() {
    return this.table
  }

}

export default Helper