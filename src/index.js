import Facebook from './facebook.js'
import Instagram from './instagram.js'
import Linkedin from './linkedin.js'
import { uuid } from 'uuidv4'
import Knex from 'knex'
import Helper from './helper.js'
import Query from './query.js'
// https://devhints.io/knex

class SocialMediaMonitor {

  facebook = null
  instagram = null
  linkedin = null
  database = null
  databaseOptions = {}

  channels = [ 'facebook', 'instagram', 'linkedin' ]

  constructor(config) {
    const options = {
      facebook: { pages: [] },
      instagram: { pages: [] },
      linkedin: { pages: [] }
    }
    if (typeof config === 'object' && config !== null) {
      if (config.facebook instanceof Array) {
        options.facebook.pages = config.facebook
      }
      if (config.instagram instanceof Array) {
        options.instagram.pages = config.instagram
      }
      if (config.linkedin instanceof Array) {
        options.linkedin.pages = config.linkedin
      }
      if (config.databaseOptions) {
        const required = [ 'host', 'port', 'user', 'password', 'database' ]
        if (required.every(item => config.databaseOptions.hasOwnProperty(item))) {
          required.forEach(item => this.databaseOptions[item] = config.databaseOptions[item])
        } else {
          throw new Error('invalid database options')
        }
      }
    }
    const info = { limit: this.limit }
    this.facebook = new Facebook({ ...options.facebook, ...info })
    this.instagram = new Instagram({ ...options.instagram, ...info })
    this.linkedin = new Linkedin({ ...options.facebook, ...info })
  }

  async createDatabase() {
    if (this.databaseOptions) {
      const options = {
        client: this.databaseOptions.client || 'pg',
        version: this.databaseOptions.version || '7.2',
        connection: {
          host : this.databaseOptions.host,
          port : this.databaseOptions.port,
          user : this.databaseOptions.user,
          password : this.databaseOptions.password,
          database : this.databaseOptions.database
        }
      }

      try {
        this.database = Knex(options)
        const exists = await this.database.schema.hasTable(Helper.getTableName())
        if (!exists) {
          await this.database.schema.createTable(Helper.getTableName(), (table) => {
            table.increments();
            table.string('uuid').defaultTo(uuid())
            table.string('page_id');
            table.string('comment_id');
            table.string('thread_id');
            table.string('channel').defaultTo(null)
            table.string('message_type').defaultTo(null)
            table.boolean('adverse').defaultTo(false)
            table.boolean('pqc').defaultTo(false)
            table.boolean('mi').defaultTo(false)
            table.boolean('handled').defaultTo(false)
            table.boolean('spam').defaultTo(false)
            table.boolean('archived').defaultTo(false)
            table.json('metadata').defaultTo({})
          })
        }
      } catch (error) {
        throw error
      }
    }
  }

  async connect() {
    if (this.databaseOptions) {
      const options = {
        client: this.databaseOptions.client || 'pg',
        version: this.databaseOptions.version || '7.2',
        connection: {
          host : this.databaseOptions.host,
          port : this.databaseOptions.port,
          user : this.databaseOptions.user,
          password : this.databaseOptions.password,
          database : this.databaseOptions.database
        }
      }

      try {
        this.database = Knex(options)
      } catch (error) {
        throw error
      }
    } else {
      console.info('no database options provided')
    }
  }

  getConnection() {
    return this.database
  }

  destroyConnection() {
    if (this.database) {
      return this.database.destroy()
    }
  }

  async getMessages() {
    await this.connect()
    const fb = await this.facebook.getMessages()
    const msgs = [
      ...fb.messages
    ]
    const errors = [
      ...fb.errors
    ]
    const comments = [];
    msgs.forEach(m => {
      if (m.comments instanceof Array) {
        m.comments.forEach(n => {
          comments.push(n.id);
          if(n.comments instanceof Array) {
            n.comments.forEach(b => {
              comments.push(b.id);
            });
          }
        });
      }
    })

    const rows = await Query.getEscalations(this.database, comments)
    const messages = Helper.setEscalations(rows, msgs)
    
    await this.destroyConnection()
    return { messages, errors }
  }

  async reply(messages) {
    messages = [].concat(messages)
    for (const i in messages) {
      const message = messages[i]

      if (!message.message || !message.page_id) {
        return null
      }

      if (!message.message_type) {
        return null
      }

      if (!message.message) {
        return null
      }

      // Check for object correctness separately?
      const channel = this.channels[this.channels.indexOf(message.channel)];

      if (!channel) {
        throw Error(`message ${message.id} has no channels`)
      }

      return this[channel].reply(message) // ie. this.facebook.reply(message)
    }
  }

  async escalate(messages) {
    await this.connect()
    messages = [].concat(messages)
    const inserted = []
    const changed = []
    for (const i in messages) {
      const message = messages[i]
      const rows = await this.database.select('comment_id', 'page_id')
      .from(Helper.getTableName())
      .where('page_id', message.page_id)
      .andWhere('comment_id', message.comment_id)
      .returning('*')
      if (rows.length > 0) {
        const row = await this.database(Helper.getTableName())
        .where('page_id', message.page_id)
        .andWhere('comment_id', message.comment_id)
        .update(message)
        .returning('*')
        changed.push(row[0])
      } else {
        const row = await this.database(Helper.getTableName())
        .insert(message)
          .returning('*')
        inserted.push(row[0])
      }
    }
    await this.destroyConnection()
    return inserted.concat(changed)
  }
}

export default SocialMediaMonitor

