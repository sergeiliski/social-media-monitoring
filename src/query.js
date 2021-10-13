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

}

export default Query