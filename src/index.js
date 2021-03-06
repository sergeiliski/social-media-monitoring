import Facebook from './facebook.js'
import Instagram from './instagram.js'
import Linkedin from './linkedin.js'
import { uuid } from 'uuidv4'
import Knex from 'knex'
import Helper from './helper.js'
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
        const exists = await this.database.schema.hasTable(Helper.getTableName())
        console.log('hasTable:', exists);
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
        console.log('ERRRRRROR');
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
    const messages = [
      ...(await this.facebook.getMessages())
    ]
    const threads = messages.map(m => m.thread_id)
    const pages = messages.map(m => m.page_id)
    const rows = await this.database
      .select('thread_id', 'page_id', 'adverse', 'pqc', 'mi')
      .from(Helper.getTableName())
      .whereIn('thread_id', threads)
    rows.forEach((row) => {
      messages.forEach((message, i) => {
        if (row.thread_id === message.thread_id && row.page_id === message.page_id) {
          messages[i].adverse = row.adverse
          messages[i].pqc = row.pqc
          messages[i].mi = row.mi
        }
      })
    })
    return messages
  }

  async reply(messages) {
    // [{
    //   text: 'Thank you for your message. Fuck off.',
    //   facebook: true,
    //   feed_message: false,
    //   direct_message: true,
    //   page_id: '55535',
    //   comment: {
    //     id: '12345'
    //   },
    //   from: {
    //     id: '355535'
    //   }
    // }]
    messages = [].concat(messages)
    console.log('messages:', messages)
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
      console.log('channel', channel)

      if (!channel) {
        throw Error(`message ${message.id} has no channels`)
      }
      console.log('message:', message)
      return this[channel].reply(message) // ie. this.facebook.reply(message)
    }
  }

  async escalate(messages) {
    messages = [].concat(messages)
    const inserted = []
    const changed = []
    for (const i in messages) {
      const message = messages[i]
      const rows = await this.database.select('thread_id', 'page_id')
      .from(Helper.getTableName())
      .where('page_id', message.page_id)
      .andWhere('thread_id', message.thread_id)
      .returning('*')
      if (rows.length > 0) {
        const row = await this.database(Helper.getTableName())
        .where('page_id', message.page_id)
        .andWhere('thread_id', message.thread_id)
        .update(message)
        .returning('*')
        changed.push(row[0])
      } else {
        const row = await this.database(Helper.getTableName())
        .insert(message)
          .returning('*')
        inserted.push(row)
      }
    }
    return inserted.concat(changed)
  }
}

export default SocialMediaMonitor

