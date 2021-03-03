class Helper {

  static table = 'SocialMediaMonitor'

  static filterParticipants(participants, id) {
    const participant = participants.filter((p) => {
      return p.id !== id
    })
    return participant.length > 1 ? [] : participant
  }

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