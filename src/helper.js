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

  static setMetadata(rows, messages) {
    rows.forEach((row) => {
      messages.forEach((thread, i) => {
        if (
          row.page_id !== thread.page_id
        ) {
          // Top object. Not message
          return
        }
        thread.comments.forEach((comment, j) => {
          if (row.comment_id === comment.id) {
            messages[i].comments[j].metadata = JSON.parse(row.metadata)
          }
          if (comment.comments instanceof Array) {
            comment.comments.forEach((cmt, k) => {
              if (row.comment_id === cmt.id) {
                messages[i].comments[j].comments[k].metadata = JSON.parse(row.metadata)
              }
            })
          }
        });
      })
    })
    return messages
  }

  static setEscalations(rows, messages) {
    rows.forEach((row) => {
      messages.forEach((thread, i) => {
        if (
          row.page_id !== thread.page_id
        ) {
          // Top object. Not message
          return
        }
        thread.comments.forEach((comment, j) => {
          if (row.comment_id === comment.id) {
            messages[i].comments[j].adverse = row.adverse
            messages[i].comments[j].pqc = row.pqc
            messages[i].comments[j].mi = row.mi
          }
          if (comment.comments instanceof Array) {
            comment.comments.forEach((cmt, k) => {
              if (row.comment_id === cmt.id) {
                messages[i].comments[j].comments[k].adverse = row.adverse
                messages[i].comments[j].comments[k].pqc = row.pqc
                messages[i].comments[j].comments[k].mi = row.mi
              }
            })
          }
        });
      })
    })
    return messages
  }

  static setInsertCommentData(message) {
    if (message.created_time) {
      if (message.metadata) {
        message.metadata['created_time'] = message.created_time;
      } else {
        message.metadata = {
          created_time: message.created_time
        }
      }
      delete message.created_time
    }
    return message;
  }

}

export default Helper