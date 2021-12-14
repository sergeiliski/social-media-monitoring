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
      .insert(Helper.setInsertCommentData(message))
      .returning('*')
    } catch (err) {
      console.error(err);
      throw Error('Failed during insert comment.')
    }
  }

  static async getExportData(database, filters) {
    try {
      return database.select(
        'comment_id',
        'page_id',
        'message_type',
        'channel',
        'adverse',
        'pqc',
        'mi',
        'handled',
        'spam',
        'archived',
        'metadata'
      )
      .from(Helper.getTableName())
      .modify(function(query) {
        if (filters) {
          if (filters.start_date) {
            query.whereRaw(
              `cast(metadata::jsonb->>'created_time' as Date) >= '${new Date(filters.start_date).toISOString().split('T')[0]}'`
            )
          }
          if (filters.end_date) {
            query.whereRaw(
              `cast(metadata::jsonb->>'created_time' as Date) < '${new Date(filters.end_date).toISOString().split('T')[0]}'`
            )
          }
          if (filters.adverse) {
            query.orWhere('adverse', true)
          }
          if (filters.pqc) {
            query.orWhere('pqc', true)
          }
          if (filters.mi) {
            query.orWhere('mi', true)
          }
          if (filters.clients && filters.clients.length > 0) {
            query.whereIn('page_id', filters.clients.map(c => c.id))
          }
        }
      })
      .returning('*')
    } catch (err) {
      throw Error('Failed during export.')
    }
  }

}

export default Query