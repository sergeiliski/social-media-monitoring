class Helper {

  static table = 'SocialMediaMonitor'

  static getSimpleDatabaseConfigs() {
    return {
      databaseOptions: {
        user: '',
        host: 'localhost',
        port: 5432,
        password: '',
        database: ''
      }
    }
  }

  static getFacebookPages() {
    return [{
      id: '',
      token: ''
    }, {
      id: '',
      token: ''
    }]
  }

  static getTableName() {
    return this.table
  }

}

export default Helper