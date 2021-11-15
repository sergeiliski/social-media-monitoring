import Helper from './helper.js'

class Query {

  static async getEscalations(database, comments) {
    const rows = await database
      .select('comment_id', 'page_id', 'adverse', 'pqc', 'mi')
      .from(Helper.getTableName())
      .whereIn('comment_id', comments)
      .andWhere((q) => {
        q.orWhere('adverse', true).orWhere('pqc', true).orWhere('mi', true)
      })
      return rows
  }

  static async getMetadata(database, comments) {
    const rows = await database
      .select('comment_id', 'page_id', 'metadata')
      .from(Helper.getTableName())
      .whereIn('comment_id', comments)
      .whereNotNull('metadata')
      return rows
  }

  static async findComment(database, page_id, comment_id) {
    try {
      return database.select('comment_id', 'page_id')
      .from(Helper.getTableName())
      .where('page_id', page_id)
      .andWhere('comment_id', comment_id)
      .returning('*')
    } catch (error) {
      throw Error('Failed during find comment.')
    }
  }

  static async updateComment(database, page_id, comment_id, message) {
    try {
      return database(Helper.getTableName())
      .where('page_id', page_id)
      .andWhere('comment_id', comment_id)
      .update(message)
      .returning('*')
    } catch (error) {
      throw Error('Failed during update comment.')
    }
  }

  static async insertComment(database, message) {
    try {
      return database(Helper.getTableName())
      .insert(message)
      .returning('*')
    } catch {
      throw Error('Failed during insert comment.')
    }
  }

}

export default Query